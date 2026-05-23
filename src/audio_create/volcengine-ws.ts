import WebSocket from "ws";
import { Buffer } from "buffer";
import {
  EventType,
  FullClientRequest,
  MsgType,
  ReceiveMessage,
} from "../utils/volcengine-protocol";
import { logger } from "../utils/logger";
import type { BatchItem } from "../config";
import { resolveRole } from "../config";
import { BaseAudioCreator, registerAudioProvider } from "./base";
import {
  getVolcEngineWsDefaults,
  buildVolcAdditions,
} from "./volcengine-ws.config";
import type { VolcEngineWsConfig } from "./volcengine-ws.config";

export class VolcEngineWsAudioCreator extends BaseAudioCreator {
  private readonly opts: VolcEngineWsConfig;

  constructor(config: Record<string, unknown>) {
    super();
    // 合并：默认配置 → 用户自定义覆盖
    this.opts = {
      ...getVolcEngineWsDefaults(),
      ...(config as Partial<VolcEngineWsConfig>),
    };
  }

  override getRoleMap() {
    return this.opts.roleMap;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "X-Api-Resource-Id": this.opts.resourceId,
      "X-Api-Connect-Id": crypto.randomUUID(),
      "X-Api-Request-Id": crypto.randomUUID(),
      "X-Control-Require-Usage-Tokens-Return": "*",
    };

    if (this.opts.apiKey) {
      headers["X-Api-Key"] = this.opts.apiKey;
    } else {
      headers["X-Api-App-Id"] = this.opts.appId;
      headers["X-Api-Access-Key"] = this.opts.accessToken;
    }

    return headers;
  }

  private async connect(): Promise<WebSocket> {
    const ws = new WebSocket(this.opts.endpoint, {
      headers: this.buildHeaders(),
      skipUTF8Validation: true,
    });

    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", (err) => reject(err));
      ws.on("unexpected-response", (_req, res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          reject(
            new Error(
              `握手失败 status=${res.statusCode} ${res.statusMessage ?? ""} body=${body || "<empty>"}`,
            ),
          );
        });
      });
    });

    return ws;
  }

  private buildRequestPayload(item: BatchItem): Uint8Array {
    const { speaker } = resolveRole(item, this.opts.roleMap);
    // 合并单条 item 的 options 覆盖全局配置
    const merged = { ...this.opts, ...item.options };
    const request = {
      user: {
        uid: crypto.randomUUID(),
      },
      req_params: {
        speaker,
        text: item.text,
        model: merged.model || undefined,
        audio_params: {
          format: merged.encoding,
          sample_rate: merged.sampleRate,
          enable_timestamp: merged.enableTimestamp,
        },
        additions: buildVolcAdditions(item, merged),
      },
    };

    return new TextEncoder().encode(JSON.stringify(request));
  }

  override async synthOne(item: BatchItem): Promise<Uint8Array> {
    const resolved = resolveRole(item, this.opts.roleMap);
    const ws = await this.connect();

    try {
      await FullClientRequest(ws, this.buildRequestPayload(item));

      const totalAudio: Uint8Array[] = [];

      while (true) {
        const msg = await ReceiveMessage(ws);

        switch (msg.type) {
          case MsgType.FullServerResponse:
            break;
          case MsgType.AudioOnlyServer:
            totalAudio.push(msg.payload);
            break;
          default:
            throw new Error(String(msg));
        }

        if (
          msg.type === MsgType.FullServerResponse &&
          msg.event === EventType.SessionFinished
        ) {
          break;
        }
      }

      if (totalAudio.length === 0) {
        throw new Error(
          `未收到音频数据: ${resolved.nameZh} (${resolved.speaker})`,
        );
      }

      logger.info(
        `${resolved.nameZh} (${resolved.speaker}) 合成完成, ${totalAudio.length} chunks`,
      );
      return Buffer.concat(totalAudio);
    } finally {
      ws.close();
    }
  }
}

// 自注册到工厂
registerAudioProvider("volcengine_ws", VolcEngineWsAudioCreator);
