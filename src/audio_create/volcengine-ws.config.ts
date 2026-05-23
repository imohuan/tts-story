import type { BatchItem } from "../config";
import { envString, type RoleMap } from "../config";

// ════════════════════════════════════════════════════════════
// 火山引擎 TTS WebSocket 协议 - 默认配置
// ════════════════════════════════════════════════════════════

/**
 * 火山引擎 WebSocket 默认角色映射表
 * 角色键名 → { 中文名, speaker ID }
 */
export const VOLCENGINE_WS_DEFAULT_ROLE_MAP: RoleMap = {
  narrator: { nameZh: "旁白", speaker: "zh_female_vv_uranus_bigtts" },
  male_lead: {
    nameZh: "男主",
    speaker: "saturn_zh_male_shuanglangshaonian_tob",
  },
  female_lead: { nameZh: "女主", speaker: "zh_female_vv_uranus_bigtts" },
};

export type VolcEngineWsConfig = {
  // ── 鉴权 ────────────────────────────────────────────────
  /**
   * API Key（新版鉴权，推荐）
   * 配置后走 X-Api-Key 鉴权，无需 appid + accessToken
   * https://console.volcengine.com/speech/new/setting/apikeys?projectName=default
   */
  apiKey: string;

  /**
   * 应用 ID（旧版鉴权）
   * https://console.volcengine.com/speech/app
   */
  appId: string;

  /**
   * 访问令牌（旧版鉴权，与 appId 配套）
   * 控制台应用详情获取
   */
  accessToken: string;

  // ── 连接 ────────────────────────────────────────────────
  /**
   * WebSocket 接口地址
   * 通常无需修改
   */
  endpoint: string;

  /**
   * 资源 ID（计费资源版本，不是 model）
   * 语音合成 2.0 建议固定为 seed-tts-2.0
   */
  resourceId: string;

  /**
   * 模型参数（写入 req_params.model）
   * 可选值：seed-tts-2.0-standard / seed-tts-2.0-expressive
   * 不填默认走 standard
   */
  model: string;

  // ── 音频输出 ────────────────────────────────────────────
  /**
   * 输出音频编码格式
   * 可选：mp3 / wav
   */
  encoding: "mp3" | "wav";

  /**
   * 采样率
   * 可选值：8000 / 16000 / 24000 / 44100
   */
  sampleRate: number;

  /**
   * 是否启用时间戳
   */
  enableTimestamp: boolean;

  // ── 附加参数 ────────────────────────────────────────────
  /**
   * 是否禁用 Markdown 过滤
   */
  disableMarkdownFilter: boolean;

  /**
   * 是否使用标签解析器
   */
  useTagParser: boolean;

  // ── 角色映射 ──────────────────────────────────────────
  /**
   * 角色名 → (中文名, 火山引擎 speaker ID) 映射表
   * 内置默认：narrator(旁白) / male_lead(男主) / female_lead(女主)
   * 用户可扩展自定义角色，如 "villain": { nameZh: "反派", speaker: "some_id" }
   */
  roleMap: RoleMap;
};

/**
 * 火山引擎 WebSocket TTS 默认配置
 * env 中只需覆盖密钥，其余参数在此调整
 */
export function getVolcEngineWsDefaults(): VolcEngineWsConfig {
  return {
    // 鉴权 — 从 .env 读取，无需在此填写
    apiKey: envString("VOLC_API_KEY", ""),
    appId: envString("VOLC_APP_ID", ""),
    accessToken: envString("VOLC_ACCESS_TOKEN", ""),

    // 连接
    endpoint: "wss://openspeech.bytedance.com/api/v3/tts/unidirectional/stream",
    resourceId: "seed-tts-2.0",
    model: "seed-tts-2.0-expressive",

    // 音频输出
    encoding: "mp3",
    sampleRate: 24000,
    enableTimestamp: true,

    // 附加参数
    disableMarkdownFilter: false,
    useTagParser: false,

    // 角色映射
    roleMap: VOLCENGINE_WS_DEFAULT_ROLE_MAP,
  };
}

/**
 * 从 BatchItem 的 stylePrompt 构建火山引擎 additions 字段
 */
export function buildVolcAdditions(
  item: BatchItem,
  config: VolcEngineWsConfig,
): string {
  return JSON.stringify({
    disable_markdown_filter: config.disableMarkdownFilter,
    context_texts: item.stylePrompt,
    use_tag_parser: config.useTagParser,
  });
}
