import { logger } from "../utils/logger";
import type { BatchItem } from "../config";
import { resolveRole } from "../config";
import { BaseAudioCreator, registerAudioProvider } from "./base";
import {
  getMiniMaxHttpDefaults,
  buildMiniMaxRequestBody,
} from "./minimax-http.config";
import type { MiniMaxHttpConfig } from "./minimax-http.config";

export class MiniMaxHttpAudioCreator extends BaseAudioCreator {
  private readonly opts: MiniMaxHttpConfig;

  constructor(config: Record<string, unknown>) {
    super();
    // 合并：默认配置 → 用户自定义覆盖
    this.opts = {
      ...getMiniMaxHttpDefaults(),
      ...(config as Partial<MiniMaxHttpConfig>),
    };
  }

  override getRoleMap() {
    return this.opts.roleMap;
  }

  override async synthOne(item: BatchItem): Promise<Uint8Array> {
    const resolved = resolveRole(item, this.opts.roleMap);
    const options = resolved.options;
    const voiceId = (options.speaker as string) || this.opts.voiceSetting.voiceId;
    const body = buildMiniMaxRequestBody(item.text, {
      ...this.opts,
      ...options,
      voiceSetting: {
        ...this.opts.voiceSetting,
        ...(options.voiceSetting as Record<string, unknown> ?? {}),
        voiceId,
      },
    });

    const resp = await fetch(this.opts.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(
        `MiniMax HTTP 请求失败 status=${resp.status} ${resp.statusText} body=${text}`,
      );
    }

    const result = (await resp.json()) as {
      base_resp?: { status_code?: number; status_msg?: string };
      data?: { audio?: string };
      extra_info?: { audio_format?: string };
    };

    // 检查业务错误
    if (result.base_resp?.status_code !== 0) {
      throw new Error(
        `MiniMax 业务错误: code=${result.base_resp?.status_code} msg=${result.base_resp?.status_msg}`,
      );
    }

    const audio = result.data?.audio;
    if (!audio || typeof audio !== "string") {
      throw new Error("MiniMax 返回结果中缺少 data.audio");
    }

    // 解析音频数据
    let buffer: Buffer;
    if (/^https?:\/\//i.test(audio)) {
      // URL 模式：下载音频
      const audioResp = await fetch(audio);
      if (!audioResp.ok) {
        throw new Error(`音频 URL 下载失败: ${audioResp.status}`);
      }
      const arrBuf = await audioResp.arrayBuffer();
      buffer = Buffer.from(arrBuf);
    } else {
      // hex 模式
      const hex = audio.trim();
      if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
        throw new Error("data.audio 不是有效 hex，也不是 URL");
      }
      buffer = Buffer.from(hex, "hex");
    }

    logger.info(
      `${resolved.nameZh} (${options.speaker}) 合成完成, ${buffer.length} bytes`,
    );
    return new Uint8Array(buffer);
  }
}

// 自注册到工厂
registerAudioProvider("minimax_http", MiniMaxHttpAudioCreator);
