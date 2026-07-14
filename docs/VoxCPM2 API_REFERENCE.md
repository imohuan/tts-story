# VoxCPM2 后台 API 参考文档

## 服务概览

| 项目 | 说明 |
|------|------|
| 框架 | Gradio 6.14.0 |
| 端口 | `8808` |
| 协议 | HTTP + SSE (Server-Sent Events) |
| 并发 | **不支持**（串行处理，`concurrency_limit=1`） |
| 队列 | 最多排队 10 个请求，超出则拒绝 |
| API 前缀 | `/gradio_api/` |

---

## 核心 API 端点

### 1. 获取 API 元信息（Schema）

```
GET http://{host}:8808/gradio_api/info
```

返回所有端点的参数定义、类型、默认值等完整 schema。**这是 Gradio 6 中 Swagger docs 的替代品。**

---

### 2. 提交 TTS 生成任务（核心接口）

Gradio 6 采用 **两阶段 SSE 模式**，不支持一步到位返回结果。

#### 第一步：提交任务

```
POST http://{host}:8808/gradio_api/call/generate
Content-Type: application/json
```

**请求体：**

```json
{
  "data": [
    "Hello, this is a text to speech test.",   // [0] text
    "",                                          // [1] control_instruction
    null,                                        // [2] ref_wav
    false,                                       // [3] use_prompt_text
    "",                                          // [4] prompt_text_value
    2.0,                                         // [5] cfg_value
    false,                                       // [6] do_normalize
    false,                                       // [7] denoise
    10                                           // [8] dit_steps
  ]
}
```

**成功响应：**

```json
{"event_id": "b6d691def5b344f48a58346cdb28037f"}
```

#### 第二步：获取结果（SSE 轮询）

```
GET http://{host}:8808/gradio_api/call/generate/{event_id}
```

**成功响应（SSE 格式）：**

```
event: complete
data: [{"path": "/tmp/gradio/.../audio.wav", "url": "http://{host}:8808/gradio_api/file=/tmp/gradio/.../audio.wav", "size": null, "orig_name": "audio.wav", "mime_type": null, "is_stream": false, "meta": {"_type": "gradio.FileData"}}]
```

> 下载音频：直接用返回的 `url` 字段，形如 `http://{host}:8808/gradio_api/file=/tmp/gradio/xxx/audio.wav`

---

### 3. ASR 语音识别（参考音频自动转文字）

当下开启了"极致克隆模式"（`use_prompt_text=true`）时，可用于自动识别参考音频的文本内容。

#### 第一步：提交识别

```
POST http://{host}:8808/gradio_api/call/_run_asr_if_needed
Content-Type: application/json
```

**请求体：**

```json
{
  "data": [
    true,                                        // [0] checked (是否触发识别)
    "/path/to/reference.wav"                     // [1] audio_path (参考音频文件路径)
  ]
}
```

#### 第二步：获取识别结果

```
GET http://{host}:8808/gradio_api/call/_run_asr_if_needed/{event_id}
```

返回 SSE 流，`data` 字段中包含识别出的文本。

---

### 4. 极致克隆模式开关

```
POST http://{host}:8808/gradio_api/call/_on_toggle_instant
Content-Type: application/json
```

**请求体：**

```json
{
  "data": [true]                                 // [0] checked (true=开启, false=关闭)
}
```

> 注意：开启极致克隆模式后，`control_instruction` 会被禁用。

---

## `/call/generate` 参数详解

| 索引 | 参数名 | 类型 | 必填 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| 0 | `text` | `str` | 是 | - | 要合成的目标文本 |
| 1 | `control_instruction` | `str` | 否 | `""` | 声音描述（如 "年轻女性，温柔甜美"），极致克隆模式下会被忽略 |
| 2 | `ref_wav` | `str`/`null` | 否 | `null` | 参考音频文件路径 |
| 3 | `use_prompt_text` | `bool` | 否 | `false` | 是否开启极致克隆模式（需要提供参考音频文本） |
| 4 | `prompt_text_value` | `str` | 否 | `""` | 参考音频的文字内容（极致克隆模式使用） |
| 5 | `cfg_value` | `float` | 否 | `2.0` | CFG 引导强度（1.0 - 3.0），值越大越贴合提示 |
| 6 | `do_normalize` | `bool` | 否 | `false` | 是否对输入文本做规范化处理 |
| 7 | `denoise` | `bool` | 否 | `false` | 是否对参考音频做降噪处理（ZipEnhancer） |
| 8 | `dit_steps` | `int` | 否 | `10` | LocDiT 流匹配迭代步数（1 - 50） |

---

## 三种生成模式

### 模式一：声音设计（Voice Design）

不提供参考音频，仅用 `control_instruction` 描述声音特征：

```json
{"data": ["你好世界", "温柔甜美的年轻女孩", null, false, "", 2.0, false, false, 10]}
```

### 模式二：可控克隆（Controllable Cloning）

提供参考音频 + 可选的声音描述：

```json
{"data": ["你好世界", "语速稍快，兴奋", "/path/to/ref.wav", false, "", 2.0, false, false, 10]}
```

### 模式三：极致克隆（Ultimate Cloning）

提供参考音频 + 参考音频的完整文本：

```json
{"data": ["你好世界", "", "/path/to/ref.wav", true, "参考音频的文字内容", 2.0, false, false, 10]}
```

---

## 完整调用示例（bash）

```bash
HOST="localhost:8808"
REF_WAV="/path/to/reference.wav"

# Step 1: 提交生成任务
EVENT=$(curl -s -X POST "http://${HOST}/gradio_api/call/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "data": ["你好世界，这是一个测试", "", null, false, "", 2.0, false, false, 10]
  }')

EVENT_ID=$(echo "$EVENT" | python3 -c "import sys,json; print(json.load(sys.stdin)['event_id'])")

# Step 2: 轮询结果
RESPONSE=$(curl -s -N "http://${HOST}/gradio_api/call/generate/${EVENT_ID}")

# Step 3: 提取音频 URL
AUDIO_URL=$(echo "$RESPONSE" | python3 -c "
import sys,json
for line in sys.stdin:
    if line.startswith('data:'):
        arr = json.loads(line[6:].strip())
        print(arr[0]['url'])
")

# Step 4: 下载音频
curl -o output.wav "$AUDIO_URL"
```

---

## 限流与并发

| 参数 | 值 | 说明 |
|------|---|------|
| `default_concurrency_limit` | 1 | 同时处理 1 个请求 |
| `max_size` | 10 | 队列最大等待数 |

请求超过并发+队列上限时会被拒绝。如需调整，修改 `app.py` 第 494 行：

```python
interface.queue(max_size=10, default_concurrency_limit=1).launch(...)
```
