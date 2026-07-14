## 1) 文本模型：按输入价格从低到高

这里包含 `chat / responses / completion` 这类主要文本模型。

| 模型 | 类型 | 上下文 | 输入 | 缓存输入 | 输出 |
|---|---:|---:|---:|---:|---:|
| `gpt-5-nano` | chat | 272K | **$0.05** | $0.005 | $0.40 |
| `gpt-4.1-nano` | chat | 1.04758M | **$0.10** | $0.025 | $0.40 |
| `gpt-4o-mini` | chat | 128K | **$0.15** | $0.075 | $0.60 |
| `gpt-5.4-nano` | chat | 400K | **$0.20** | $0.02 | $1.25 |
| `gpt-5-mini` | chat | 272K | **$0.25** | $0.025 | $2.00 |
| `gpt-5.1-codex-mini` | responses | 272K | **$0.25** | $0.025 | $2.00 |
| `gpt-4.1-mini` | chat | 1.04758M | **$0.40** | $0.10 | $1.60 |
| `gpt-3.5-turbo` | chat | 16K | **$0.50** | - | $1.50 |
| `gpt-5.4-mini` | chat | 400K | **$0.75** | $0.075 | $4.50 |
| `gpt-5` | chat | 272K | **$1.25** | $0.125 | $10.00 |
| `gpt-5-codex` | responses | 272K | **$1.25** | $0.125 | $10.00 |
| `gpt-5.1` | chat | 272K | **$1.25** | $0.125 | $10.00 |
| `gpt-5.1-codex` | responses | 272K | **$1.25** | $0.125 | $10.00 |
| `gpt-5.1-codex-max` | responses | 272K | **$1.25** | $0.125 | $10.00 |
| `gpt-5-search-api` | chat | 272K | **$1.25** | $0.125 | $10.00 |
| `gpt-5.2` | chat | 272K | **$1.75** | $0.175 | $14.00 |
| `gpt-5.2-codex` | responses | 272K | **$1.75** | $0.175 | $14.00 |
| `gpt-5.3-codex` | responses | 272K | **$1.75** | $0.175 | $14.00 |
| `gpt-4.1` | chat | 1.04758M | **$2.00** | $0.50 | $8.00 |
| `gpt-5.4` | chat | 1M | **$2.50** | $0.25 | $15.00 |
| `gpt-4o` | chat | 128K | **$2.50** | $1.25 | $10.00 |
| `gpt-5.5` | chat | 1M | **$5.00** | $0.50 | $30.00 |
| `gpt-4-turbo` | chat | 128K | **$10.00** | - | $30.00 |
| `gpt-4` | chat | 8K | **$30.00** | - | $60.00 |
| `gpt-4.5-preview` | chat | 128K | **$75.00** | $37.50 | $150.00 |

---

## 2) 音频 / 实时：按输入价格从低到高

这类不能直接和纯文本完全等价比较，但你表里既然放一起，我单独列。

### 2.1 音频 chat / realtime

| 模型 | 类型 | 上下文 | 输入 | 缓存输入 | 输出 | 额外 |
|---|---:|---:|---:|---:|---:|---|
| `gpt-audio-mini` | chat | 128K | **$0.60** | - | $2.40 | audio in $10/M; out $20/M |
| `gpt-realtime-mini` | chat | 128K | **$0.60** | - | $2.40 | audio in $10/M; out $20/M |
| `gpt-realtime-mini-2025-10-06` | chat | 128K | **$0.60** | $0.06 | $2.40 | audio in $10/M; out $20/M |
| `gpt-audio` | chat | 128K | **$2.50** | - | $10.00 | audio in $32/M; out $64/M |
| `gpt-4o-audio-preview-2025-06-03` | chat | 128K | **$2.50** | - | $10.00 | audio in $40/M; out $80/M |
| `gpt-realtime` | chat | 32K | **$4.00** | $0.40 | $16.00 | audio in $32/M; out $64/M |
| `gpt-4o-realtime-preview-2025-06-03` | chat | 128K | **$5.00** | $2.50 | $20.00 | audio in $40/M; out $80/M |

### 2.2 语音转文字 / 文字转语音

| 模型 | 类型 | 输入 | 输出 | 额外 |
|---|---:|---:|---:|---|
| `gpt-4o-mini-transcribe-2025-12-15` | audio_transcription | **$1.25** | $5.00 | audio in $3/M |
| `gpt-4o-transcribe-diarize` | audio_transcription | **$2.50** | $10.00 | audio in $6/M |
| `gpt-4o-mini-tts-2025-12-15` | audio_speech | **$2.50** | $10.00 | audio out $12/M; $0.00025/sec |

---

## 3) 图片模型：按输入价格从低到高

图片类计费口径本来就和文本不同，也单列。

| 模型 | 类型 | 输入 | 缓存输入 | 输出 | 额外 |
|---|---:|---:|---:|---:|---|
| `gpt-image-1-mini` | image_generation | **$2.00** | $0.20 | - | image in $2.5/M; out $8/M |
| `gpt-image-1.5` | image_generation | **$5.00** | $1.25 | $10.00 | image in $8/M; out $32/M |
| `gpt-image-1` | image_generation | **$5.00** | $1.25 | - | image in $10/M; out $40/M |

---

## 4) 被我忽略掉的典型模型

因为它们满足“**同类里版本更低，但价格更高或没有优势**”。

### 4.1 `gpt-3.5` 家族
这些基本都可以忽略：
- `gpt-3.5-turbo-0301`
- `gpt-3.5-turbo-0613`
- `gpt-3.5-turbo-1106`
- `gpt-3.5-turbo-16k`
- `gpt-3.5-turbo-16k-0613`
- `gpt-3.5-turbo-instruct`
- `gpt-3.5-turbo-instruct-0914`

原因：
- 比 `gpt-3.5-turbo` 更老；
- 价格更高或上下文更差；
- 同族没有保留价值。

### 4.2 `gpt-4` 家族
这些可忽略：
- `gpt-4-0314`
- `gpt-4-0613`
- `gpt-4-32k`
- `gpt-4-32k-0314`
- `gpt-4-32k-0613`
- `gpt-4-0125-preview`
- `gpt-4-1106-preview`
- `gpt-4-turbo-preview`
- `gpt-4-vision-preview`
- `gpt-4-1106-vision-preview`
- `gpt-4-turbo-2024-04-09`

原因：
- 同族里 `gpt-4-turbo` 或更新系更合理；
- 老版本没有价格优势。

### 4.3 `gpt-4.1` 家族
可忽略 dated 版本：
- `gpt-4.1-2025-04-14`
- `gpt-4.1-mini-2025-04-14`
- `gpt-4.1-nano-2025-04-14`

### 4.4 `gpt-4o` 家族
可忽略：
- `gpt-4o-2024-05-13`（比 `gpt-4o` 更贵）
- `gpt-4o-2024-08-06`
- `gpt-4o-2024-11-20`
- `gpt-4o-mini-2024-07-18`
- `gpt-4o-mini-search-preview`
- `gpt-4o-search-preview`
- `gpt-4o-audio-preview-2024-10-01`
- `gpt-4o-audio-preview-2024-12-17`
- `gpt-4o-mini-audio-preview`
- `gpt-4o-mini-audio-preview-2024-12-17`
- `gpt-4o-mini-realtime-preview`
- `gpt-4o-mini-realtime-preview-2024-12-17`
- `gpt-4o-realtime-preview-2024-10-01`
- `gpt-4o-realtime-preview-2024-12-17`
- `gpt-4o-mini-transcribe`
- `gpt-4o-mini-transcribe-2025-03-20`
- `gpt-4o-mini-tts`
- `gpt-4o-mini-tts-2025-03-20`

### 4.5 `gpt-5` / `gpt-5.1` / `gpt-5.2` / `gpt-5.4` / `gpt-5.5`
可忽略大部分 dated 或 alias：
- `gpt-5-2025-08-07`
- `gpt-5-chat`
- `gpt-5-chat-latest`
- `gpt-5-mini-2025-08-07`
- `gpt-5-nano-2025-08-07`
- `gpt-5-search-api-2025-10-14`
- `gpt-5.1-2025-11-13`
- `gpt-5.1-chat-latest`
- `gpt-5.2-2025-12-11`
- `gpt-5.2-chat-latest`
- `gpt-5.2-pro-2025-12-11`
- `gpt-5.4-nano` 无 dated 重复可保留
- `gpt-5.4-mini`、`gpt-5.4`、`gpt-5.5` 保留

---

## 5) 如果只看“性价比层级”，结论很直接

### 最便宜梯队
- `gpt-5-nano`
- `gpt-4.1-nano`
- `gpt-4o-mini`

### 中低价梯队
- `gpt-5.4-nano`
- `gpt-5-mini`
- `gpt-5.1-codex-mini`
- `gpt-4.1-mini`

### 中价主力梯队
- `gpt-5`
- `gpt-5.1`
- `gpt-5-codex`
- `gpt-5.1-codex`
- `gpt-5.2`
- `gpt-5.3-codex`
- `gpt-4.1`
- `gpt-4o`

### 高价梯队
- `gpt-5.4`
- `gpt-5.5`
- `gpt-4-turbo`
- `gpt-4`
- `gpt-4.5-preview`

---

## 6) 一个更实用的最终排序建议

如果你是为了**实际选型**，我建议按这个理解：

### 追求最低成本
1. `gpt-5-nano`
2. `gpt-4.1-nano`
3. `gpt-4o-mini`

### 成本和能力平衡
1. `gpt-5-mini`
2. `gpt-4.1-mini`
3. `gpt-5`
4. `gpt-4o`

### 追求效果优先
1. `gpt-5.5`
2. `gpt-5.4`
3. `gpt-5.2`
4. `gpt-5.1`
5. `gpt-5`

