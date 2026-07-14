import { join, resolve } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { Client, handle_file } from "@gradio/client";
import type { Client as GradioClient } from "@gradio/client";
import { logger } from "../utils/logger";
import type { BatchItem } from "../config";
import { resolveRole } from "../config";
import { BaseAudioCreator, registerAudioProvider } from "./base";
import {
  getVoxCPM2GradioDefaults,
  type VoxCPM2GradioConfig,
} from "./voxcpm2-gradio.config";

// ── 参考音频目录 ──────────────────────────────────────
const VOICES_DIR = resolve("references_voices");

/** 根据名称或路径解析参考音频的完整路径 */
function resolveRefWav(raw: string): string {
  if (!raw) return "";

  // 已经是完整路径且文件存在 → 直接用
  if (existsSync(raw)) return raw;

  // 在 references_voices 里按名称匹配（忽略后缀）
  if (existsSync(VOICES_DIR)) {
    const files = readdirSync(VOICES_DIR);
    const lower = raw.toLowerCase();
    for (const f of files) {
      const stem = f.replace(/\.[^.]+$/, "").toLowerCase();
      if (stem === lower) {
        return join(VOICES_DIR, f);
      }
    }
  }

  // 都匹配不到，原样返回让下游报错
  return raw;
}

// ── VoxCPM2 Gradio 音频生成器 ─────────────────────────
// 通过 @gradio/client 直连 VoxCPM2 Gradio 服务，自动根据参数判断合成模式。
//
// 模式自动判断：
//   有 refWav + stylePrompt → 极致克隆
//   有 refWav 无 stylePrompt → 纯音频克隆
//   无 refWav               → 声音设计
//
// item 字段：
//   item.text         → 要合成的文本
//   item.stylePrompt  → 声音描述 / 极致克隆 prompt（复用同一个字段）
//   item.refWav       → 参考音频（完整路径 或 references_voices/ 下的文件名）
//   item.options      → 覆盖 cfgValue / doNormalize / denoise / ditSteps
//
// 配置优先级：item.options > JSON 文件级 providerConfig > .env 全局

export class VoxCPM2GradioAudioCreator extends BaseAudioCreator {
  private opts: VoxCPM2GradioConfig;
  private client: GradioClient | null = null;

  constructor(config: Record<string, unknown>) {
    super();
    this.opts = { ...getVoxCPM2GradioDefaults(), ...config } as VoxCPM2GradioConfig;
  }

  override getRoleMap() {
    return this.opts.roleMap;
  }

  private async getClient(): Promise<GradioClient> {
    if (this.client) return this.client;
    const url = /^https?:\/\//i.test(this.opts.host) ? this.opts.host : "http://" + this.opts.host;
    logger.info("VoxCPM2 " + url);
    this.client = await Client.connect(url);
    return this.client;
  }

  override async synthOne(item: BatchItem): Promise<Uint8Array> {
    const resolved = resolveRole(item, this.opts.roleMap);
    const client = await this.getClient();
    const cfg = { ...this.opts, ...resolved.options };

    const stylePrompt = item.stylePrompt ?? "";
    const refWav = resolveRefWav(item.refWav ?? (resolved.options.refWav as string) ?? "");

    // 有 refWav + stylePrompt → 极致克隆
    const usePromptText = !!(refWav && stylePrompt);

    const mode = usePromptText ? "极致克隆"
      : refWav ? "纯音频克隆"
      : "声音设计";

    logger.info("VoxCPM2 [" + mode + "] " + resolved.nameZh + ": " + item.text.slice(0, 30) + "...");

    const result = await client.predict("/generate", [
      item.text,
      usePromptText ? "" : stylePrompt,
      refWav ? handle_file(refWav) : null,
      usePromptText,
      usePromptText ? stylePrompt : "",
      cfg.cfgValue as number,
      cfg.doNormalize as boolean,
      cfg.denoise as boolean,
      cfg.ditSteps as number,
    ]);

    const data = result.data as unknown;

    // Gradio 返回格式：可能是数组 [FileData] 或字符串
    const fileObj = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;

    if (!fileObj || typeof fileObj !== "object") {
      throw new Error(
        `VoxCPM2 返回数据异常：期望 FileData 对象，实际收到 ${typeof data} —— ${JSON.stringify(data).slice(0, 300)}`,
      );
    }

    const remotePath = fileObj.path as string | undefined;
    const remoteUrl = fileObj.url as string | undefined;
    let audio: Uint8Array | undefined;

    // 优先尝试本地路径（@gradio/client 可能已下载到临时目录）
    if (remotePath) {
      const localFile = Bun.file(remotePath);
      if (await localFile.exists()) {
        audio = new Uint8Array(await localFile.arrayBuffer());
      }
    }

    // 本地不存在，从远程 URL 下载
    if (!audio) {
      const downloadUrl = remoteUrl ?? remotePath;
      if (!downloadUrl) {
        throw new Error(
          `VoxCPM2 返回数据中无音频 URL/path：${JSON.stringify(fileObj).slice(0, 300)}`,
        );
      }
      logger.info("VoxCPM2 下载音频: " + downloadUrl.slice(0, 80) + "...");
      const resp = await fetch(downloadUrl);
      if (!resp.ok) {
        throw new Error(
          `VoxCPM2 音频下载失败 HTTP ${resp.status} ${resp.statusText} —— ${downloadUrl.slice(0, 120)}`,
        );
      }
      audio = new Uint8Array(await resp.arrayBuffer());
    }

    logger.info(resolved.nameZh + " (VoxCPM2) " + audio.length + " bytes");
    return audio;
  }
}

registerAudioProvider("voxcpm2_gradio", VoxCPM2GradioAudioCreator);