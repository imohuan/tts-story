# 批量 TTS 框架 PRD

## 背景

doubao-tts 项目为火山引擎豆包语音合成 API 提供了 TypeScript 客户端，包含单条合成（`index.ts`）和批量合成（`batch.ts`）两种模式。重构前，`batch.ts` 是一个约 300 行的"巨石入口"，同时承担配置解析、协议构造、WebSocket 通信、并发调度、文件输出和 FFmpeg 合并六大职责。`protocols.ts` 作为协议基础设施散落在根目录，被 `docs/` 下的 demo 和业务入口共同依赖。现有并发调度仅使用 `nextIndex += 1` 轮询，缺少重试、退避、超时和失败汇总语义。

## 目标

1. 将 `batch.ts` 拆分为可复用模块：配置、并发、日志、协议、音频创建、批处理编排。
2. 将 `protocols.ts` 协议能力收拢到 `src/utils/volcengine-protocol.ts`，根目录仅做兼容 re-export。
3. 配置、并发、日志做成通用能力，批处理只做编排。
4. 保留根目录 `batch.ts` / `index.ts` / `protocols.ts` 作为兼容层，避免破坏现有脚本与 docs demo 的相对导入。
5. 音频创建（`TtsAudioCreator`）只负责"输入一条任务，输出音频字节"，不承载并发、文件系统与合并逻辑。

## 非目标

- 不改变火山引擎 WebSocket 协议本身。
- 不做异步长文本接口（HTTP Chunked/SSE）的对接。
- 不引入外部 DI 框架或配置中心。
- 不改动 `docs/` 下 demo 项目的独立性和自有依赖。

## 模块架构

```
batch-input.json
      │
      ▼
 src/config.ts          ← 统一解析 CLI / 环境变量 / 默认值
      │
      ▼
 src/utils/concurrency.ts  ← 通用并发队列
      │
      ▼
 src/audio_create/tts-audio-creator.ts  ← WebSocket 音频生成
      │
      ▼
 chunk audio files
      │
      ▼
 ffmpeg merge
```

### 模块边界

| 模块 | 路径 | 职责 | 依赖 |
|------|------|------|------|
| 配置 | `src/config.ts` | CLI / 环境变量 / 默认值解析，类型定义 | 无 |
| 并发器 | `src/utils/concurrency.ts` | 并发队列、重试、退避、抖动、超时、失败上限、结果顺序保持 | 无 |
| 日志 | `src/utils/logger.ts` | 带调用文件名/行号/列号的结构化日志 | 无 |
| 协议 | `src/utils/volcengine-protocol.ts` | 枚举、序列化/反序列化、WebSocket 收发工具 | logger |
| 音频创建 | `src/audio_create/tts-audio-creator.ts` | 单条 TTS 合成，输入 BatchItem 输出 Uint8Array | config, volcengine-protocol, logger |
| 批处理编排 | `src/batch/run.ts` | 读取输入、校验、调度并发器、写分片、合并 | config, concurrency, tts-audio-creator, logger |
| 兼容入口 | 根目录 `batch.ts` / `index.ts` / `protocols.ts` | 薄入口，转调 src/ | src/ 各模块 |

## 配置项

| 参数 | CLI 参数 | 环境变量 | 默认值 | 说明 |
|------|---------|----------|--------|------|
| apiKey | `--api_key` | `VOLC_API_KEY` | - | 新版鉴权密钥 |
| appid | `--appid` | `VOLC_APP_ID` | - | 旧版鉴权 App ID |
| accessToken | `--access_token` | `VOLC_ACCESS_TOKEN` | - | 旧版鉴权 Access Token |
| endpoint | `--endpoint` | `VOLC_ENDPOINT` | `wss://openspeech.bytedance.com/api/v3/tts/unidirectional/stream` | WebSocket 端点 |
| resourceId | `--resource_id` | `VOLC_RESOURCE_ID` | `volc.service_type.10029` | 资源 ID |
| model | `--model` | `VOLC_MODEL` | - | 模型标识 |
| encoding | `--encoding` | `VOLC_ENCODING` | `mp3` | 音频编码 |
| concurrency | `--concurrency` | `VOLC_CONCURRENCY` | `5` | 并发数 |
| input | `--input` | `VOLC_BATCH_INPUT` | `batch-input.example.json` | 输入 JSON 路径 |
| outDir | `--out_dir` | `VOLC_BATCH_OUT_DIR` | `output/chunks` | 分片输出目录 |
| output | `--output` | `VOLC_BATCH_OUTPUT` | `output/merged.<encoding>` | 合并输出路径 |
| retryCount | `--retry_count` | `VOLC_RETRY_COUNT` | `2` | 最大重试次数 |
| retryDelayMs | `--retry_delay_ms` | `VOLC_RETRY_DELAY_MS` | `500` | 重试初始延迟(ms) |
| retryBackoffMs | `--retry_backoff_ms` | `VOLC_RETRY_BACKOFF_MS` | `2` | 退避因子 |
| retryJitterMs | `--retry_jitter_ms` | `VOLC_RETRY_JITTER_MS` | `150` | 抖动范围(ms) |
| taskDelayMs | `--task_delay_ms` | `VOLC_TASK_DELAY_MS` | `0` | 任务启动间隔(ms) |
| taskTimeoutMs | `--task_timeout_ms` | `VOLC_TASK_TIMEOUT_MS` | `0` | 单任务超时(ms)，0=不限 |
| stopOnError | `--stop_on_error` | `VOLC_STOP_ON_ERROR` | `false` | 遇错即停 |

## 重试 / 失败策略

- **重试语义**：任务级重试，每个任务独立重试 `retryCount` 次。
- **退避算法**：指数退避 `delayMs * backoffFactor^(attempt-1) + random(0, jitterMs)`。
- **超时**：`taskTimeoutMs > 0` 时，单次执行超过阈值即触发超时错误，可被重试捕获。
- **失败上限**：`stopOnError = true` 时，任一任务最终失败即终止整个批处理；否则继续执行剩余任务。
- **结果汇总**：`ConcurrencyResult<R>` 包含 `results`（保序）、`errors`、`successCount`、`failedCount`。
- **可选启动间隔**：`taskDelayMs` 控制相邻任务启动间隔，避免瞬间打满连接。

## 日志规范

- 使用 `src/utils/logger.ts` 统一输出。
- 格式：`[文件名:行号:列号] 消息内容`。
- 四个级别：`log` / `info` / `warn` / `error`。
- 协议层（`volcengine-protocol.ts`）的 WebSocket 收发日志使用 `logger.info`。
- 业务层使用 `logger.info`（进度）、`logger.warn`（重试）、`logger.error`（失败）。

## 当前架构问题（重构前）

1. **巨石入口**：`batch.ts` 同时承担配置、协议、传输、并发、输出和合并，扩展新能力时容易互相污染。
2. **协议层位置不当**：`protocols.ts` 在根目录，和业务入口耦合；docs demo 使用 `../protocols` 相对路径，说明协议层已成为共享基础设施，应该上移到 `src/utils/`。
3. **并发语义缺失**：`nextIndex += 1` 轮询没有统一的重试、退避、超时、失败阈值和结果汇总语义。
4. **FFmpeg 硬编码**：`mergeWithFFmpeg` 硬编码了 Windows ffmpeg 路径，跨环境/跨格式扩展成本高。
5. **日志裸用**：裸 `console.log`，缺少调用点信息和结构化失败上下文，排障成本高。
6. **输入无校验**：输入 JSON 没有显式 schema 校验，只靠运行时报错。

## 可扩展性问题与后续演进

### 短期可扩展

- **新增音频编码**：在 `BatchConfig.encoding` 类型中添加新值，`TtsAudioCreator` 中调整 `audio_params.format`，`mergeWithFFmpeg` 中添加对应 ffmpeg 参数。
- **新增鉴权方式**：在 `TtsAudioCreator.buildHeaders()` 中扩展 header 构造逻辑。
- **调整并发策略**：修改 `concurrency.ts` 的 `ConcurrencyOptions` 即可，不影响业务层。

### 中期演进方向

- **输入 Schema 校验**：引入 zod 等库做 JSON schema 校验，在 `runBatch` 读取后即校验。
- **进度回调与事件流**：在 `ConcurrencyOptions` 上扩展 `onProgress` / `onComplete` 事件，支持 UI 集成。
- **断点续跑**：在 `runBatch` 中检测 `outDir` 已有分片，跳过已完成任务。
- **多格式输出**：支持同时输出 mp3 + wav，或在合并阶段做格式转换。
- **FFmpeg 路径发现**：完善 `findFFmpeg` 的平台检测逻辑（Linux/macOS/Windows），支持 `which` 查找。

### 长期边界

- **双向流式 TTS**：当前 `TtsAudioCreator` 仅支持单向流式（unidirectional），双向流式需要不同的连接生命周期管理，建议新建 `BidirectionalTtsAudioCreator`。
- **HTTP Chunked/SSE**：异步长文本接口基于 HTTP 而非 WebSocket，协议层完全不同，建议新建 `src/utils/http-protocol.ts`。
- **分布式调度**：当前并发器为进程内，跨机器调度需要外部队列（如 Redis），属于架构升级范畴。

## 验收标准

1. `batch.ts` 的核心逻辑已迁移到 `src/`，根目录只保留薄入口和兼容导出。
2. `protocols.ts` 迁移到 `src/utils/` 后，docs demo 与旧入口不需要改调用方式（通过根目录 re-export 兼容）。
3. 并发逻辑可独立复用，且配置化（重试、退避、抖动、超时、失败上限均可配置）。
4. 日志输出可直接定位调用文件与行列。
5. PRD 能直接指导后续实现与后续扩展。
