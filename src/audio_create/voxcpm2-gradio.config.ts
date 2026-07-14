import { envString, envNumber, type RoleMap } from "../config";

// ════════════════════════════════════════════════════════════
// VoxCPM2 Gradio API - 默认配置
// VoxCPM2 是一个基于 Gradio 的语音合成模型
// 支持：声音设计 / 可控克隆 / 纯音频克隆 / 极致克隆
//
// 配置优先级：item.options > JSON 文件级 providerConfig > .env 全局
// 合成模式自动判断，无需手动指定：
//   - 有 refWav + promptTextValue → ultimate_clone
//   - 有 refWav + controlInstruction → controllable_clone
//   - 有 refWav，无其他 → pure_audio_clone
//   - 其他 → voice_design
// ════════════════════════════════════════════════════════════

export const VOXCPM2_DEFAULT_ROLE_MAP: RoleMap = {
  narrator: { nameZh: "旁白", speaker: "" },
  male_lead: { nameZh: "男主", speaker: "" },
  female_lead: { nameZh: "女主", speaker: "" },
};

export type VoxCPM2GradioConfig = {
  /** Gradio 服务地址，如 localhost:8808 */
  host: string;

  /** CFG 引导强度，范围 [1.0, 3.0]，默认 2.0 */
  cfgValue: number;

  /** 是否对音频做归一化 */
  doNormalize: boolean;

  /** 是否降噪 */
  denoise: boolean;

  /** DIT 推理步数，默认 10，越大质量越好但越慢 */
  ditSteps: number;

  /** 角色映射 */
  roleMap: RoleMap;
};

export function getVoxCPM2GradioDefaults(): VoxCPM2GradioConfig {
  return {
    host: envString("VOXCPM2_HOST", "localhost:8808"),
    cfgValue: envNumber("VOXCPM2_CFG_VALUE", 2),
    doNormalize: envString("VOXCPM2_DO_NORMALIZE", "false") === "true",
    denoise: envString("VOXCPM2_DENOISE", "false") === "true",
    ditSteps: envNumber("VOXCPM2_DIT_STEPS", 10),
    roleMap: VOXCPM2_DEFAULT_ROLE_MAP,
  };
}