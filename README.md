# 多平台批量 TTS

基于 [Bun](https://bun.sh) 的批量语音合成工具，支持火山引擎（豆包）、MiniMax、Edge TTS、VoxCPM2 等后端；从 JSON 脚本批量生成多角色对话音频，自动合并为完整音轨。

| Provider | 标识 | 说明 |
|----------|------|------|
| 火山引擎（豆包） | `volcengine_ws` | WebSocket 流式，`stylePrompt` 自然语言控制风格 |
| MiniMax | `minimax_http` | HTTP 非流式，支持情绪/语速/停顿/语气词/音效 |
| Edge TTS | `edge_tts` | 通过 HTTP 网关调用微软 Azure 语音，免费测试用 |
| VoxCPM2 | `voxcpm2_gradio` | 通过 Gradio 接口调用，支持声音设计/音频克隆/极致克隆 |

详细 JSON 编写指南见 **[CRATE_JSON_SKILL.md](./CRATE_JSON_SKILL.md)**。

## 环境要求

- [Bun](https://bun.sh)
- [FFmpeg](https://ffmpeg.org/)（合并音频用，需在 `PATH` 中或通过 `TTS_FFMPEG_PATH` 指定）
- 对应服务商的 API 密钥 / 服务地址

## 快速开始

### 1. 安装

```bash
bun install
```

### 2. 配置 `.env`

```env
TTS_PROVIDER=volcengine_ws

# 火山引擎
VOLC_API_KEY=your_api_key

# MiniMax
MINIMAX_API_KEY=your_minimax_api_key

# VoxCPM2 Gradio 服务 （可以使用 https://cnb.cool/yichenyanyu/VoxCPM）
VOXCPM2_HOST=localhost:8808
```

### 3. 运行

```bash
bun run start
# 或
bun run dev
```

扫描 `input/` 下所有 `.json` 文件，逐个合成并合并，输出到 `output/`。

### 4. 查看角色音色

```bash
bun run export:rolemaps
```

## 命令行参数

| 参数 | 环境变量 | 默认值 | 说明 |
|------|----------|--------|------|
| `--provider` | `TTS_PROVIDER` | `volcengine_ws` | TTS 后端 |
| `--encoding` | `TTS_ENCODING` | `mp3` | 输出编码：`mp3` / `wav` |
| `--concurrency` | `TTS_CONCURRENCY` | `5` | 并发合成数 |
| `--input_dir` | `TTS_INPUT_DIR` | `input` | 输入 JSON 目录 |
| `--output_dir` | `TTS_OUTPUT_DIR` | `output` | 输出根目录 |
| `--output_file_name` | `TTS_OUTPUT_FILE_NAME` | `output` | 合并文件名 |
| `--retry_count` | `TTS_RETRY_COUNT` | `2` | 单条最大重试次数 |
| `--retry_delay_ms` | `TTS_RETRY_DELAY_MS` | `500` | 重试初始延迟(ms) |
| `--task_delay_ms` | `TTS_TASK_DELAY_MS` | `0` | 相邻任务启动间隔 |
| `--task_timeout_ms` | `TTS_TASK_TIMEOUT_MS` | `0` | 单任务超时，0=不限 |
| `--stop_on_error` | `TTS_STOP_ON_ERROR` | `false` | 遇错即停 |
| `--ffmpeg_path` | `TTS_FFMPEG_PATH` | `ffmpeg` | FFmpeg 路径 |
| `--provider_config` | `TTS_PROVIDER_CONFIG` | — | Provider 覆盖：`key=val,key2=val2` |

## 项目结构

```
├── input/                    # JSON 输入脚本
├── output/                   # 合成结果（git 忽略）
├── references_voices/        # VoxCPM2 参考音频
├── src/
│   ├── main.ts               # 入口
│   ├── config.ts             # 配置与类型
│   ├── batch/run.ts          # 批处理编排
│   ├── audio_create/         # 各 TTS 后端实现
│   └── utils/                # 并发、日志、自动检测
├── static/                   # HTML 辅助工具（音色预览、JSON 查看器）
└── docs/                     # API 协议与参考文档
```

## 辅助工具

- `bun run export:rolemaps` — 导出各 provider 角色映射表
- `bun run check` — TypeScript 类型检查
- `static/voice-preview.html` — 浏览试听音色列表
- `static/json-folder-viewer.html` — 可视化检查 JSON 对话脚本

## 许可证

个人学习用途，使用前请遵守各服务商条款与计费规则。
