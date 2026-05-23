import { logger } from "../utils/logger";
import type { BatchItem } from "../config";
import { resolveRole } from "../config";
import { BaseAudioCreator, registerAudioProvider } from "./base";
import {
  getEdgeTtsDefaults,
  type EdgeTtsConfig,
} from "./edge-tts.config";

export function sanitizeEdgeText(text: string): string {
  return text
    .replace(/<#\s*\d+(?:\.\d+)?\s*#>/g, "")
    .replace(/[^\p{Script=Han}A-Za-z0-9\p{P}\p{Zs}\r\n]/gu, "")
    .trim();
}

export class EdgeTtsAudioCreator extends BaseAudioCreator {
  private readonly opts: EdgeTtsConfig;

  constructor(config: Record<string, unknown>) {
    super();
    this.opts = {
      ...getEdgeTtsDefaults(),
      ...(config as Partial<EdgeTtsConfig>),
    };
  }

  override getRoleMap() {
    return this.opts.roleMap;
  }

  override async synthOne(item: BatchItem): Promise<Uint8Array> {
    const resolved = resolveRole(item, this.opts.roleMap);
    const merged = { ...this.opts, ...item.options } as EdgeTtsConfig;
    const voice = resolved.speaker || merged.voice;

    const base = (merged.baseUrl || "https://tts.wangwangit.com").replace(/\/$/, "");
    const url = `${base}/v1/audio/speech`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: sanitizeEdgeText(item.text),
        voice,
        speed: Number(merged.speed),
        pitch: merged.pitch,
        style: merged.style,
        volume: "0",
      }),
    });

    if (!resp.ok) {
      const err = (await resp
        .json()
        .catch(() => ({ error: { message: `HTTP ${resp.status}` } }))) as {
        error?: { message?: string };
      };
      throw new Error(err.error?.message || `请求失败: ${resp.status}`);
    }

    const buf = await resp.arrayBuffer();
    const audio = new Uint8Array(buf);

    logger.info(
      `${resolved.nameZh} (${voice}) 合成完成, ${audio.length} bytes`,
    );

    return audio;
  }
}

registerAudioProvider("edge_tts", EdgeTtsAudioCreator);