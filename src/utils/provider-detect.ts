import type { BatchItem } from "../config";
import type { AudioProviderType } from "../audio_create/base";

/** MiniMax 语气词标签 */
const MINIMAX_EMOTION_TAGS = [
  "(laughs)",
  "(chuckle)",
  "(sighs)",
  "(breath)",
  "(coughs)",
  "(gasps)",
] as const;

/** MiniMax 停顿标记正则：如 `<#0.8#>` */
const MINIMAX_PAUSE_RE = /<#\d+\.?\d*#>/;

/**
 * 根据 BatchItem 的特征自动判断应使用的 provider
 *
 * 判断规则：
 * - 有非空 stylePrompt → volcengine_ws（stylePrompt 是火山引擎独有字段）
 * - options 含 voiceSetting / voiceModify / pronunciationDict → minimax_http
 * - text 含 `<#秒数#>` 停顿标记 → minimax_http
 * - text 含语气词标签 `(laughs)` 等 → minimax_http
 * - 无法判断 → 返回 null，由调用方回退到全局默认
 */
export function detectProvider(item: BatchItem): AudioProviderType | null {
  // 1. stylePrompt 非空 → 火山引擎特征
  if (item.stylePrompt?.trim()) {
    return "volcengine_ws";
  }

  // 2. options 含 minimax 专有字段
  if (item.options) {
    if (
      item.options.voiceSetting ||
      item.options.voiceModify ||
      item.options.pronunciationDict
    ) {
      return "minimax_http";
    }
  }

  // 3. text 含 minimax 内嵌标记
  const text = item.text || "";

  if (MINIMAX_PAUSE_RE.test(text)) {
    return "minimax_http";
  }

  for (const tag of MINIMAX_EMOTION_TAGS) {
    if (text.includes(tag)) {
      return "minimax_http";
    }
  }

  // 无法自动判断
  return null;
}

/**
 * 解析单条 BatchItem 实际应使用的 provider
 *
 * 优先级：
 * 1. item.provider 为具体 provider → 直接使用
 * 2. item.provider 为 "auto" → 自动检测
 * 3. item.provider 未设置 + 全局 provider 为 "auto" → 自动检测
 * 4. item.provider 未设置 + 全局 provider 为具体值 → 使用全局值
 * 5. 自动检测失败 → 回退到 fallback
 */
export function resolveEffectiveProvider(
  item: BatchItem,
  globalProvider: AudioProviderType | "auto",
  fallback: AudioProviderType = "volcengine_ws",
): AudioProviderType {
  // item 显式指定了具体 provider
  if (item.provider && item.provider !== "auto") {
    return item.provider;
  }

  // 需要自动检测的场景：item.provider === "auto" 或全局为 "auto"
  const needAutoDetect = item.provider === "auto" || globalProvider === "auto";
  if (needAutoDetect) {
    const detected = detectProvider(item);
    if (detected) return detected;
    // 检测失败，使用全局具体值或 fallback
    if (globalProvider !== "auto") return globalProvider;
    return fallback;
  }

  // 全局为具体值，item 未指定 → 使用全局值
  return globalProvider;
}
