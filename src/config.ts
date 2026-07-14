export type CliArgs = Record<string, string>;

export function parseArgs(argv: string[]): CliArgs {
  const result: CliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const part = argv[i];
    if (!part?.startsWith("--")) continue;

    const key = part.slice(2);
    const next = argv[i + 1];
    if (!key || !next || next.startsWith("--")) continue;

    result[key] = next;
    i += 1;
  }

  return result;
}

export function envString(name: string, fallback = ""): string {
  return Bun.env[name] ?? fallback;
}

export function envBool(name: string, fallback = false): boolean {
  const value = Bun.env[name];
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

export function envNumber(name: string, fallback: number): number {
  const value = Bun.env[name];
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

import type { AudioProviderType, ProviderSetting } from "./audio_create/base";
export type { AudioProviderType, ProviderSetting };

// ── 通用 TTS 配置 ──────────────────────────────────────
export type BatchConfig = {
  provider: ProviderSetting;
  encoding: "mp3" | "wav";
  concurrency: number;

  /** 输入文件夹，扫描其中所有 .json 文件 */
  inputDir: string;

  /** 输出根文件夹，每个 JSON 在此创建同名子目录 */
  outputDir: string;

  /** 合并后音频文件名（不含后缀），默认 "output" */
  outputFileName: string;

  retryCount: number;
  retryDelayMs: number;
  retryBackoffMs: number;
  retryJitterMs: number;
  taskDelayMs: number;
  taskTimeoutMs: number;
  stopOnError: boolean;
  ffmpegPath: string;

  /**
   * Provider 专属配置，透传给对应的 AudioCreator 构造函数
   * 各 provider 的默认配置和字段定义在 src/audio_create/*.config.ts 中
   * 此处可覆盖任何默认值
   */
  providerConfig: Record<string, unknown>;
};

/** 默认角色名 */
export const DEFAULT_ROLE = "narrator";

/** 角色映射条目：nameZh 是元数据，其余字段均为该角色的默认 provider 配置 */
export type RoleEntry = {
  /** 角色中文名，用于日志和文件名 */
  nameZh: string;
  /** 其余字段直接作为该角色的默认配置合并到 item */
  [key: string]: unknown;
};

/**
 * 角色映射表类型：角色键名 → 角色条目
 * 内置角色键名：narrator（旁白）/ male_lead（男主）/ female_lead（女主）
 * 用户可扩展自定义角色，如 villain、sidekick 等
 */
export type RoleMap = Record<string, RoleEntry>;

/** 角色解析结果 */
export type ResolvedRole = {
  /** 角色键名（如 narrator / male_lead） */
  role: string;
  /** 角色中文名（如 旁白 / 男主） */
  nameZh: string;
  /** 合并后的配置：roleEntry.defaults + voiceType 覆盖 + item.options（item 最高优先） */
  options: Record<string, unknown>;
};

export type BatchItem = {
  text: string;
  stylePrompt?: string;
  /** 参考音频路径或名称（用于克隆模式），匹配 references_voices/ 目录 */
  refWav?: string;
  /** 角色名，由各 provider 的 roleMap 映射到对应的声音 ID；默认 "narrator" */
  role?: string;
  /** 直接指定 provider 专用的声音 ID，优先级高于 role */
  voiceType?: string;
  /**
   * 单条文本的 provider 专属配置覆盖
   * 优先级高于全局 providerConfig，用于同一批次中不同文本需要不同参数的场景
   * 例如：{ speed: 1.2, emotion: "happy" } 可覆盖对应 provider 的默认语速和情绪
   */
  options?: Record<string, unknown>;
  /**
   * 单条文本的 provider 指定
   * - 指定具体 provider（如 "volcengine_ws"）则该条使用指定 provider
   * - 设为 "auto" 则根据条目特征自动判断
   * - 不设置则使用全局 TTS_PROVIDER 配置
   */
  provider?: ProviderSetting;
};

/** 单个输入 JSON 的文件级配置 */
export type BatchFileConfig = {
  /** 文件级 provider，优先级低于 item.provider，高于 env */
  provider?: ProviderSetting;
  /** 文件级 providerConfig，优先级低于 item.options，高于 env 的 TTS_PROVIDER_CONFIG */
  providerConfig?: Record<string, unknown>;
  /** 文件级角色映射：可覆盖/追加 provider 默认 roleMap */
  roleMap?: RoleMap;
};

/** 输入 JSON 结构（兼容旧数组格式） */
export type BatchFileInput =
  | BatchItem[]
  | {
      config?: BatchFileConfig;
      items: BatchItem[];
    };

/**
 * 通用角色解析：根据 roleMap 解析角色，合并配置。
 * 合并优先级：roleEntry 配置 < voiceType 快捷覆盖 < item.options（最高优先）
 */
export function resolveRole(item: BatchItem, roleMap: RoleMap): ResolvedRole {
  const role = item.role || DEFAULT_ROLE;
  const entry = roleMap[role] ?? roleMap[DEFAULT_ROLE];
  if (!entry)
    throw new Error(`roleMap 中缺少默认角色 "${DEFAULT_ROLE}" 的映射`);

  // 摘出 nameZh，其余全部作为角色配置
  const { nameZh, ...roleConfig } = entry;

  // voiceType 作为 speaker 的快捷覆盖
  const voiceOverride = item.voiceType?.trim()
    ? { speaker: item.voiceType.trim() }
    : {};

  return {
    role,
    nameZh,
    options: {
      ...roleConfig,
      ...voiceOverride,
      ...item.options,
    },
  };
}

/**
 * 解析 provider 专属配置
 * 格式: --provider_config key1=val1,key2=val2
 * 或环境变量: TTS_PROVIDER_CONFIG=key1=val1,key2=val2
 */
function parseProviderConfig(raw: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const pair of raw.split(",")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    const val = pair.slice(eq + 1).trim();
    if (val === "true") {
      result[key] = true;
      continue;
    }
    if (val === "false") {
      result[key] = false;
      continue;
    }
    const num = Number(val);
    if (Number.isFinite(num) && val !== "") {
      result[key] = num;
      continue;
    }
    result[key] = val;
  }
  return result;
}

export function getBatchConfig(argv = process.argv.slice(2)): BatchConfig {
  const args = parseArgs(argv);

  // ── 通用 TTS_ 前缀 ────────────────────────────────────
  const provider = (args.provider ??
    envString("TTS_PROVIDER", "volcengine_ws")) as ProviderSetting;
  const encoding = (args.encoding ?? envString("TTS_ENCODING", "mp3")) as
    | "mp3"
    | "wav";
  const concurrencyRaw = args.concurrency ?? envString("TTS_CONCURRENCY", "5");
  const concurrency = Math.max(1, Number.parseInt(concurrencyRaw, 10) || 5);
  const inputDir = args.input_dir ?? envString("TTS_INPUT_DIR", "input");
  const outputDir = args.output_dir ?? envString("TTS_OUTPUT_DIR", "output");
  const outputFileName =
    args.output_file_name ?? envString("TTS_OUTPUT_FILE_NAME", "output");

  // 重试与调度
  const retryCount = Math.max(
    0,
    Number.parseInt(
      args.retry_count ?? envString("TTS_RETRY_COUNT", "2"),
      10,
    ) || 2,
  );
  const retryDelayMs = Math.max(
    0,
    Number.parseInt(
      args.retry_delay_ms ?? envString("TTS_RETRY_DELAY_MS", "500"),
      10,
    ) || 500,
  );
  const retryBackoffMs = Math.max(
    0,
    Number.parseInt(
      args.retry_backoff_ms ?? envString("TTS_RETRY_BACKOFF_MS", "2"),
      10,
    ) || 2,
  );
  const retryJitterMs = Math.max(
    0,
    Number.parseInt(
      args.retry_jitter_ms ?? envString("TTS_RETRY_JITTER_MS", "150"),
      10,
    ) || 150,
  );
  const taskDelayMs = Math.max(
    0,
    Number.parseInt(
      args.task_delay_ms ?? envString("TTS_TASK_DELAY_MS", "0"),
      10,
    ) || 0,
  );
  const taskTimeoutMs = Math.max(
    0,
    Number.parseInt(
      args.task_timeout_ms ?? envString("TTS_TASK_TIMEOUT_MS", "0"),
      10,
    ) || 0,
  );
  const stopOnError =
    (
      args.stop_on_error ?? envString("TTS_STOP_ON_ERROR", "false")
    ).toLowerCase() === "true";
  const ffmpegPath = args.ffmpeg_path ?? envString("TTS_FFMPEG_PATH", "ffmpeg");

  // ── Provider 专属配置 ─────────────────────────────────
  const providerConfigRaw =
    args.provider_config ?? envString("TTS_PROVIDER_CONFIG", "");
  const providerConfig = providerConfigRaw
    ? parseProviderConfig(providerConfigRaw)
    : {};

  return {
    provider,
    encoding,
    concurrency,
    inputDir,
    outputDir,
    outputFileName,
    retryCount,
    retryDelayMs,
    retryBackoffMs,
    retryJitterMs,
    taskDelayMs,
    taskTimeoutMs,
    stopOnError,
    ffmpegPath,
    providerConfig,
  };
}
