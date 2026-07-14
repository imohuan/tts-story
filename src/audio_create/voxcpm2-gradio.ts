import { Client, handle_file } from "@gradio/client";
import type { Client as GradioClient } from "@gradio/client";
import { envString, envNumber, type RoleMap } from "../config";
import { logger } from "../utils/logger";
import type { BatchItem } from "../config";
import { resolveRole } from "../config";
import { BaseAudioCreator, registerAudioProvider } from "./base";

// ── 默认角色映射 ──────────────────────────────────────
const DEFAULT_ROLE_MAP: RoleMap = {
  narrator: { nameZh: "旁白", speaker: "" },
  male_lead: { nameZh: "男主", speaker: "" },
  female_lead: { nameZh: "女主", speaker: "" },
};

// ── 配置类型 ──────────────────────────────────────────
type Config = {
  host: string;
  cfgValue: number;
  doNormalize: boolean;
  denoise: boolean;
  ditSteps: number;
  roleMap: RoleMap;
};

function defaults(): Config {
  return {
    host: envString("VOXCPM2_HOST", "localhost:8808"),
    cfgValue: envNumber("VOXCPM2_CFG_VALUE", 2),
    doNormalize: envString("VOXCPM2_DO_NORMALIZE", "false") === "true",
    denoise: envString("VOXCPM2_DENOISE", "false") === "true",
    ditSteps: envNumber("VOXCPM2_DIT_STEPS", 10),
    roleMap: DEFAULT_ROLE_MAP,
  };
}

/**
 * VoxCPM2 Gradio 音频生成器
 *
 * 通过 @gradio/client 直连 VoxCPM2 Gradio 服务，支持四种合成模式，自动根据参数判断。
 *
 * ── 模式自动判断 ──
 * 有 refWav + promptTextValue → ultimate_clone（极致克隆）
 * 有 refWav + controlInstruction → controllable_clone（可控克隆）
 * 有 refWav 无其他            → pure_audio_clone（纯音频克隆）
 * 其他                        → voice_design（纯文本声音设计）
 *
 * ── item 字段映射 ──
 * item.stylePrompt              → control_instruction（声音描述）
 * item.options.refWav           → 参考音频路径
 * item.options.promptTextValue  → 极致克隆的 prompt 文本
 * item.options.controlInstruction → 覆盖 stylePrompt 的声音描述
 * item.options.cfgValue / doNormalize / denoise / ditSteps → 覆盖全局参数
 *
 * ── 配置优先级 ──
 * item.options > JSON 文件级 providerConfig > .env 全局
 *
 * ── 环境变量 ──
 * VOXCPM2_HOST          Gradio 地址，默认 localhost:8808
 * VOXCPM2_CFG_VALUE     CFG 强度 1.0~3.0，默认 2
 * VOXCPM2_DO_NORMALIZE  归一化，默认 false
 * VOXCPM2_DENOISE       降噪，默认 false
 * VOXCPM2_DIT_STEPS     DIT 步数，默认 10
 *
 * ── JSON 输入示例 ──
 * {
 *   "items": [
 *     { "text": "你好世界", "stylePrompt": "温柔甜美的年轻女孩" },
 *     { "text": "大家好", "stylePrompt": "沉稳中年男性", "options": { "refWav": "./ref.wav" } },
 *     { "text": "测试", "options": { "refWav": "./ref.wav", "promptTextValue": "参考文本" } }
 *   ]
 * }
 */
export class VoxCPM2GradioAudioCreator extends BaseAudioCreator {
  private opts: Config;
  private client: GradioClient | null = null;

  constructor(config: Record<string, unknown>) {
    super();
    this.opts = { ...defaults(), ...config } as Config;
  }

  override getRoleMap() {
    return this.opts.roleMap;
  }

  private async getClient(): Promise<GradioClient> {
    if (this.client) return this.client;
    const url = `http://${this.opts.host}`;
    logger.info(`VoxCPM2 连接: ${url}`);
    this.client = await Client.connect(url);
    return this.client;
  }

  override async synthOne(item: BatchItem): Promise<Uint8Array> {
    const resolved = resolveRole(item, this.opts.roleMap);
    const client = await this.getClient();
    const cfg = { ...this.opts, ...item.options };

    const controlInstruction = (item.options?.controlInstruction as string)
      ?? item.stylePrompt ?? "";
    const refWav = (item.options?.refWav as string) ?? "";
    const promptText = (item.options?.promptTextValue as string) ?? "";
    const usePromptText = !!(refWav && promptText);

    const mode = usePromptText ? "极致克隆"
      : refWav ? (controlInstruction ? "可控克隆" : "纯音频克隆")
      : "声音设计";

    logger.info(`VoxCPM2 [${mode}] ${resolved.nameZh}: ${item.text.slice(0, 30)}...`);

    const result = await client.predict("/generate", [
      item.text,
      controlInstruction,
      refWav ? handle_file(refWav) : null,
      usePromptText,
      promptText,
      cfg.cfgValue as number,
      cfg.doNormalize as boolean,
      cfg.denoise as boolean,
      cfg.ditSteps as number,
    ]);

    const data = result.data as unknown;
    const audioPath: string = Array.isArray(data) ? (data[1] as string) : (data as string);

    if (!audioPath) throw new Error(`返回数据异常: ${JSON.stringify(data)}`);

    const file = Bun.file(audioPath);
    if (!(await file.exists())) throw new Error(`音频文件不存在: ${audioPath}`);

    const audio = new Uint8Array(await file.arrayBuffer());
    logger.info(`${resolved.nameZh} (VoxCPM2) 完成, ${audio.length} bytes`);
    return audio;
  }
}

registerAudioProvider("voxcpm2_gradio", VoxCPM2GradioAudioCreator);