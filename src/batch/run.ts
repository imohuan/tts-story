import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve, parse, relative } from "node:path";
import { spawn } from "node:child_process";
import {
  getBatchConfig,
  resolveRole,
  type BatchConfig,
  type BatchFileConfig,
  type BatchFileInput,
  type BatchItem,
} from "../config";
import { runConcurrent, type ConcurrencyResult } from "../utils/concurrency";
import { createAudioCreator, type BaseAudioCreator } from "../audio_create/base";
import type { AudioProviderType } from "../audio_create/base";
import { resolveEffectiveProvider } from "../utils/provider-detect";
// 导入实现以触发自注册
import "../audio_create/volcengine-ws";
import "../audio_create/minimax-http";
import "../audio_create/edge-tts";
import "../audio_create/voxcpm2-gradio";
import { logger, configureLogger } from "../utils/logger";

function runCmd(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("error", reject);
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function mergeWithFFmpeg(
  files: string[],
  outputFile: string,
  encoding: "mp3" | "wav",
  ffmpegPath: string,
): Promise<void> {
  if (files.length === 0) {
    throw new Error("没有可合并的音频文件");
  }

  const listFile = resolve("output", ".ffmpeg-concat-list.txt");
  await mkdir(resolve("output"), { recursive: true });

  const listContent = files
    .map((f) => `file '${resolve(f).replace(/\\/g, "/")}'`)
    .join("\n");
  await writeFile(listFile, listContent);

  const commonArgs = ["-y", "-f", "concat", "-safe", "0", "-i", listFile];

  try {
    if (encoding === "mp3") {
      await runCmd(ffmpegPath, [
        ...commonArgs,
        "-c:a",
        "libmp3lame",
        "-b:a",
        "192k",
        outputFile,
      ]);
    } else {
      await runCmd(ffmpegPath, [
        ...commonArgs,
        "-c:a",
        "pcm_s16le",
        outputFile,
      ]);
    }
  } finally {
    await rm(listFile, { force: true });
  }
}

function validateItems(items: BatchItem[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("输入 JSON 为空，或不是数组");
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (!item.text) {
      throw new Error(`第 ${i + 1} 项缺少 text`);
    }
  }
}

/**
 * 解析输入 JSON（兼容旧数组格式）
 */
function parseBatchFileInput(raw: string): {
  fileConfig: BatchFileConfig;
  items: BatchItem[];
} {
  const parsed = JSON.parse(raw) as BatchFileInput;

  if (Array.isArray(parsed)) {
    return { fileConfig: {}, items: parsed };
  }

  const fileConfig = parsed.config ?? {};
  const items = parsed.items ?? [];
  return { fileConfig, items };
}

/**
 * 扫描输入目录中所有 .json 文件，返回排序后的绝对路径列表
 */
async function scanJsonFiles(inputDir: string): Promise<string[]> {
  const entries = await readdir(inputDir);
  const jsonFiles: string[] = [];

  for (const entry of entries) {
    // 跳过 . 开头的文件（如 .all-features-demo.json）
    if (entry.startsWith(".")) continue;
    if (!entry.toLowerCase().endsWith(".json")) continue;
    const fullPath = join(inputDir, entry);
    const s = await stat(fullPath);
    if (s.isFile()) {
      jsonFiles.push(fullPath);
    }
  }

  jsonFiles.sort();
  return jsonFiles;
}

/**
 * 判断某个项目是否已完成（输出目录中存在合并后的音频文件）
 */
async function isProjectDone(
  projectDir: string,
  outputFileName: string,
  encoding: "mp3" | "wav",
): Promise<boolean> {
  const mergedFile = join(projectDir, `${outputFileName}.${encoding}`);
  try {
    const s = await stat(mergedFile);
    return s.isFile();
  } catch {
    return false;
  }
}

/**
 * 处理单个 JSON 文件
 */
async function processProject(
  jsonPath: string,
  config: BatchConfig,
): Promise<void> {
  const { name: stem } = parse(jsonPath);
  const projectDir = join(resolve(config.outputDir), stem);
  const chunksDir = join(projectDir, "chunks");

  // 跳过已完成的项目
  if (await isProjectDone(projectDir, config.outputFileName, config.encoding)) {
    logger.info(`[${stem}] 已存在，跳过`);
    return;
  }

  logger.info(`[${stem}] 开始处理`);

  // 读取并解析 JSON
  const raw = await Bun.file(jsonPath).text();
  const { fileConfig, items } = parseBatchFileInput(raw);
  validateItems(items);

  // 优先级：item > json(文件级) > env(全局)
  const effectiveGlobalProvider = fileConfig.provider ?? config.provider;
  const mergedProviderConfig = {
    ...config.providerConfig,
    ...(fileConfig.providerConfig ?? {}),
  };

  // 创建项目输出目录
  await mkdir(projectDir, { recursive: true });
  await mkdir(chunksDir, { recursive: true });

  // 按 provider 分组：延迟创建 creator 并缓存
  const creatorCache = new Map<AudioProviderType, BaseAudioCreator>();

  const getCreator = (provider: AudioProviderType): BaseAudioCreator => {
    if (!creatorCache.has(provider)) {
      creatorCache.set(provider, createAudioCreator(provider, mergedProviderConfig));
    }
    return creatorCache.get(provider)!;
  };

  logger.info(
    `[${stem}] 并发数: ${config.concurrency}, 任务数: ${items.length}`,
  );

  const result = await runConcurrent<BatchItem, string>({
    items,
    concurrency: config.concurrency,
    taskDelayMs: config.taskDelayMs,
    taskTimeoutMs: config.taskTimeoutMs,
    stopOnError: config.stopOnError,
    retry: {
      count: config.retryCount,
      delayMs: config.retryDelayMs,
      backoffFactor: config.retryBackoffMs,
      jitterMs: config.retryJitterMs,
    },
    run: async (item, index) => {
      const effectiveProvider = resolveEffectiveProvider(item, effectiveGlobalProvider);
      const creator = getCreator(effectiveProvider);
      const roleMap = {
        ...creator.getRoleMap(),
        ...(fileConfig.roleMap ?? {}),
      };
      const resolved = resolveRole(item, roleMap);
      logger.info(
        `[${stem}] [${index + 1}/${items.length}] ${resolved.nameZh} (${resolved.speaker}) [${effectiveProvider}]`,
      );

      const audio = await creator.synthOne(item);
      const filename = `${String(index + 1).padStart(3, "0")}-${resolved.nameZh}.${config.encoding}`;
      const filepath = join(chunksDir, filename);
      await writeFile(filepath, audio);

      logger.info(`[${stem}] saved: ${filename}`);
      return filepath;
    },
    onTaskStart: (index, attempt) => {
      if (attempt > 1) {
        logger.info(`[${stem}] [${index + 1}] 第 ${attempt} 次尝试`);
      }
    },
    onTaskRetry: (index, attempt, error) => {
      logger.warn(
        `[${stem}] [${index + 1}] 第 ${attempt} 次失败，准备重试: ${error instanceof Error ? error.message : String(error)}`,
      );
    },
    onTaskError: (index, _attempt, error) => {
      logger.error(
        `[${stem}] [${index + 1}] 任务失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    },
  });

  logger.info(
    `[${stem}] 完成: ${result.successCount} 成功, ${result.failedCount} 失败`,
  );

  // 合并成功的音频
  const validFiles = result.results.filter((f): f is string => f !== undefined);

  if (validFiles.length > 0) {
    const mergedOutput = join(
      projectDir,
      `${config.outputFileName}.${config.encoding}`,
    );
    await mergeWithFFmpeg(
      validFiles,
      mergedOutput,
      config.encoding,
      config.ffmpegPath,
    );
    logger.info(
      `[${stem}] merged: "${relative(resolve(), mergedOutput)}"`,
    );
  } else {
    logger.warn(`[${stem}] 没有成功的音频文件，跳过合并`);
  }
}

export async function runBatch(cfg?: BatchConfig): Promise<void> {
  const config = cfg ?? getBatchConfig();

  configureLogger({
    filePath: resolve("output/run.log"),
    console: true,
  });

  const inputDir = resolve(config.inputDir);
  const outputDir = resolve(config.outputDir);

  // 确保输出根目录存在
  await mkdir(outputDir, { recursive: true });

  // 扫描输入目录
  let jsonFiles: string[];
  try {
    jsonFiles = await scanJsonFiles(inputDir);
  } catch (err) {
    throw new Error(
      `扫描输入目录失败: ${inputDir} — ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (jsonFiles.length === 0) {
    logger.warn(`输入目录中没有 JSON 文件: ${inputDir}`);
    return;
  }

  logger.info(`发现 ${jsonFiles.length} 个 JSON 文件，输入: ${inputDir}`);

  // 逐个处理项目（每次只处理一个 JSON 文件）
  for (const jsonPath of jsonFiles) {
    await processProject(jsonPath, config);
  }

  logger.info("全部项目处理完毕");
}
