# 多平台批量 TTS

基于 [Bun](https://bun.sh) 的批量语音合成工具，支持火山引擎（豆包）、MiniMax、Edge TTS 等多种后端；可从 JSON 脚本批量生成多角色对话音频，并自动合并为完整音轨。

当前内置三种 TTS 后端：

| Provider | 标识 | 说明 |
|----------|------|------|
| 火山引擎（豆包） | `volcengine_ws` | WebSocket 单向流式，支持 `stylePrompt` 风格描述 |
| MiniMax | `minimax_http` | HTTP 非流式，支持情绪、语速、停顿标记等 |
| Edge TTS | `edge_tts` | 通过第三方 HTTP 网关调用微软 Edge 语音 |

## 环境要求

- [Bun](https://bun.sh)（运行时与包管理）
- [FFmpeg](https://ffmpeg.org/)（合并分片音频，需在 `PATH` 中或通过 `TTS_FFMPEG_PATH` 指定）
- 对应服务商的 API 密钥（见下方配置）

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置密钥

在项目根目录创建 `.env` 文件（已被 `.gitignore` 忽略，请勿提交到仓库）：

```env
# 通用：默认使用的 TTS 后端
TTS_PROVIDER=volcengine_ws

# 火山引擎（二选一鉴权方式）
VOLC_API_KEY=your_api_key
# 或旧版鉴权：
# VOLC_APP_ID=your_app_id
# VOLC_ACCESS_TOKEN=your_access_token

# MiniMax
MINIMAX_API_KEY=your_minimax_api_key

# Edge TTS（可选，有默认值）
# EDGE_TTS_BASE_URL=https://tts.wangwangit.com
# EDGE_TTS_VOICE=zh-CN-XiaoxiaoNeural
```

### 3. 准备输入脚本

将 JSON 文件放入 `input/` 目录。项目已附带若干示例：

- `input/example.json` — 简单双人对话（含 `stylePrompt`，适合火山引擎）
- `input/example-v2.json` / `input/example-v3.json` — MiniMax 停顿与情绪示例
- `input/对话.json` — 带文件级 `config` 的完整格式示例

### 4. 运行

```bash
bun run start
# 或
bun run dev
```

程序会扫描 `input/` 下所有 `.json` 文件，逐个合成并合并音频，输出到 `output/` 目录。

## 输入 JSON 格式

支持两种结构。

### 简单数组（兼容旧格式）

```json
[
  {
    "text": "你好，世界。",
    "role": "narrator"
  },
  {
    "text": "我是男主。",
    "role": "male_lead",
    "stylePrompt": "男声，青年音色，语速1.0，情绪平静。"
  }
]
```

### 带文件级配置（推荐）

```json
{
  "config": {
    "provider": "minimax_http",
    "providerConfig": {},
    "roleMap": {
      "female_lead": {
        "nameZh": "女主",
        "speaker": "moss_audio_9e160bff-1c39-11f1-817b-d263514e4b13"
      }
    }
  },
  "items": [
    {
      "text": "你有没有想过，人一定要热爱些什么。",
      "role": "female_lead",
      "options": {
        "voiceSetting": {
          "emotion": "calm",
          "speed": 0.95
        }
      }
    }
  ]
}
```

### 字段说明

| 字段 | 层级 | 说明 |
|------|------|------|
| `text` | item | **必填**，待合成文本 |
| `role` | item | 角色键名，通过 `roleMap` 映射到音色 ID；默认 `narrator`（旁白） |
| `voiceType` | item | 直接指定音色 ID，优先级高于 `role` |
| `stylePrompt` | item | 火山引擎专用风格/语境描述，写入 `context_texts` |
| `options` | item | 单条级别的 provider 参数覆盖（如 MiniMax 的 `voiceSetting`） |
| `provider` | item / config | 指定本条或本文件使用的后端；`auto` 表示自动检测 |
| `config.provider` | file | 文件级默认后端，优先级低于 `item.provider` |
| `config.roleMap` | file | 覆盖/扩展默认角色音色映射 |
| `config.providerConfig` | file | 覆盖 provider 默认配置 |

### 内置角色

各 provider 默认提供以下角色键名（可在 `config.roleMap` 中覆盖）：

| 键名 | 中文名 |
|------|--------|
| `narrator` | 旁白 |
| `male_lead` | 男主 |
| `female_lead` | 女主 |

也可自定义键名，如 `villain`、`sidekick` 等。

## 输出目录结构

每个输入 JSON 对应 `output/` 下的一个同名子目录：

```
output/
├── run.log                    # 运行日志
├── example/                   # 对应 input/example.json
│   ├── chunks/
│   │   ├── 001-女主.mp3
│   │   └── 002-男主.mp3
│   └── output.mp3             # FFmpeg 合并后的完整音频
└── 对话/
    ├── chunks/
    └── output.mp3
```

- 若合并后的 `output.mp3`（或 `output.wav`）已存在，再次运行时会**跳过**该项目。
- 分片文件命名：`{序号}-{角色中文名}.{编码}`。

## Provider 选择与自动检测

### 手动指定

通过环境变量或命令行设置全局默认：

```bash
TTS_PROVIDER=minimax_http bun run start
# 或
bun run start --provider minimax_http
```

也可在 JSON 的 `config.provider` 或单条 `item.provider` 中指定。

### 自动检测（`auto`）

当全局或单条 `provider` 为 `auto` 时，按以下规则选择后端：

| 特征 | 选用 |
|------|------|
| 非空 `stylePrompt` | `volcengine_ws` |
| `options` 含 `voiceSetting` / `voiceModify` / `pronunciationDict` | `minimax_http` |
| 文本含 `<#0.5#>` 停顿标记 | `minimax_http` |
| 文本含 `(laughs)` 等语气词标签 | `minimax_http` |
| 无法判断 | 回退到全局具体值，或默认 `volcengine_ws` |

### 各 Provider 特性摘要

**火山引擎 `volcengine_ws`**

- 适合需要精细风格控制的场景，通过 `stylePrompt` 描述音色、情绪、语速等。
- 密钥：`VOLC_API_KEY`（推荐）或 `VOLC_APP_ID` + `VOLC_ACCESS_TOKEN`。
- 更多协议与音色说明见 `docs/` 目录。

**MiniMax `minimax_http`**

- 支持 `options.voiceSetting`（`emotion`、`speed` 等）。
- 文本内可写停顿：`<#1.2#>`（停顿 1.2 秒）。
- 支持语气词：`(laughs)`、`(sighs)`、`(chuckle)` 等。
- 密钥：`MINIMAX_API_KEY`。

**Edge TTS `edge_tts`**

- 免费/低成本测试用，通过 HTTP 网关调用。
- 环境变量：`EDGE_TTS_BASE_URL`、`EDGE_TTS_VOICE` 等。

## 命令行参数

所有参数也可通过 `TTS_` 前缀的环境变量设置（命令行优先）。

| 参数 | 环境变量 | 默认值 | 说明 |
|------|----------|--------|------|
| `--provider` | `TTS_PROVIDER` | `volcengine_ws` | TTS 后端 |
| `--encoding` | `TTS_ENCODING` | `mp3` | 输出编码：`mp3` / `wav` |
| `--concurrency` | `TTS_CONCURRENCY` | `5` | 并发合成数 |
| `--input_dir` | `TTS_INPUT_DIR` | `input` | 输入 JSON 目录 |
| `--output_dir` | `TTS_OUTPUT_DIR` | `output` | 输出根目录 |
| `--output_file_name` | `TTS_OUTPUT_FILE_NAME` | `output` | 合并文件名（不含后缀） |
| `--retry_count` | `TTS_RETRY_COUNT` | `2` | 单条任务最大重试次数 |
| `--retry_delay_ms` | `TTS_RETRY_DELAY_MS` | `500` | 重试初始延迟（毫秒） |
| `--task_delay_ms` | `TTS_TASK_DELAY_MS` | `0` | 相邻任务启动间隔 |
| `--task_timeout_ms` | `TTS_TASK_TIMEOUT_MS` | `0` | 单任务超时，0 表示不限 |
| `--stop_on_error` | `TTS_STOP_ON_ERROR` | `false` | 遇错即停 |
| `--ffmpeg_path` | `TTS_FFMPEG_PATH` | `ffmpeg` | FFmpeg 可执行文件路径 |
| `--provider_config` | `TTS_PROVIDER_CONFIG` | — | Provider 覆盖，格式 `key=val,key2=val2` |

示例：

```bash
bun run start --provider auto --concurrency 3 --input_dir input --encoding wav
```

## 辅助工具

### 导出角色映射表

查看各 provider 内置的 `roleMap`（音色 ID 与中文名）：

```bash
# 导出全部 provider
bun run export:rolemaps

# 仅导出指定 provider，格式化缩进
bun run export:rolemaps -- --provider minimax_http --pretty 2
```

### 类型检查

```bash
bun run check
```

## 项目结构

```
项目根目录/
├── input/                 # 输入 JSON 脚本
├── output/                # 合成结果（git 忽略）
├── src/
│   ├── main.ts            # 入口
│   ├── config.ts          # 配置与类型定义
│   ├── batch/run.ts       # 批处理编排（扫描、合成、合并）
│   ├── audio_create/      # 各 TTS 后端实现
│   │   ├── base.ts
│   │   ├── volcengine-ws.ts
│   │   ├── minimax-http.ts
│   │   └── edge-tts.ts
│   ├── utils/             # 并发、日志、协议、自动检测
│   └── tools/
│       └── export-rolemaps.ts
├── static/                # 本地 HTML 工具（音色预览、JSON 查看器等）
└── docs/                  # API 协议与音色列表文档
```

## 静态页面工具

`static/` 目录下有两个纯前端辅助页面，无需启动后端服务，用浏览器直接打开对应 HTML 即可使用（双击文件，或拖入浏览器窗口）。

| 页面 | 用途 |
|------|------|
| `voice-preview.html` | 浏览、试听、筛选 TTS 音色列表，复制 `voice_id` 到脚本 |
| `json-folder-viewer.html` | 可视化检查 `input/` 等目录下的 JSON 对话脚本 |

### 音色列表预览（`voice-preview.html`）

用于在编写 `roleMap` 或挑选 MiniMax 音色时，**浏览官方音色列表、在线试听样例、一键复制 `voice_id`**，避免在文档与控制台之间来回翻找。

**数据来源**

- 默认加载同目录的 `voice-preview-zh.js`（由 `voice-preview-zh.json` 构建而来）。
- 采用 `<script>` 内嵌而非 `fetch`，因此 **`file://` 协议下也能正常打开**，不受 CORS 限制。
- 若更新了 `voice-preview-zh.json`，需先重新构建：

```bash
bun run build:voice-preview-zh
```

**主要功能**

- 卡片展示每条音色的名称、描述、标签、封面与样例音频播放器。
- 按 `voice_name` / `voice_id` / `uniq_id` 搜索，按标签筛选。
- 点击卡片右上角按钮复制 `voice_id`，可直接粘贴到 JSON 的 `speaker` 或 `voiceType` 字段。
- 顶部文本框可粘贴其他 API 返回的 JSON（需含 `data.voice_list` 数组），点击「应用预览」临时查看；支持保存/读取浏览器 `localStorage`。

**使用步骤**

1. 用浏览器打开 `static/voice-preview.html`。
2. 页面自动加载内置中文音色列表；在搜索框或标签下拉框中筛选目标音色。
3. 点击音频控件试听，满意后复制 `voice_id` 写入 `input/*.json` 的 `config.roleMap`。

### TTS JSON 可视化（`json-folder-viewer.html`）

用于在批量合成前，**快速检查 `input/` 目录下各 JSON 脚本的结构与内容**，尤其方便核对 MiniMax 停顿标记、语气词标签和 provider 推断是否合理。

**适用格式**

- 针对**简单数组格式**的脚本（即 `[{ "text": "...", "role": "..." }, ...]`）效果最佳。
- 带 `config` + `items` 的完整格式会以原始 JSON 展示，但条目表格与统计需自行对照 `items` 数组。

**主要功能**

- 通过「选择文件夹」指向项目的 `input/`（或任意含 JSON 的目录）；会记住上次选择，下次打开自动恢复（需重新授权读取）。
- 左侧列出目录内所有 `.json` 文件，点击切换预览。
- 顶部统计：条目数、角色数、**Provider 预测**（根据 `stylePrompt` / `options.voiceSetting.emotion` 等字段推断 `volcengine_ws` 或 `minimax_http`）。
- 表格可视化每条台词：`text` 中的 `<#1.2#>` 停顿、`(laughs)` 等语气词会以彩色标签高亮；同时显示 `role`、`emotion`、`stylePrompt` 等字段。
- 下方显示原始 JSON，支持「格式化」按钮美化缩进。

**使用步骤**

1. 使用 **Chromium 内核浏览器**（Chrome、Edge 等）打开 `static/json-folder-viewer.html`（依赖 File System Access API，Firefox/Safari 可能不可用）。
2. 点击「选择文件夹」，选中项目下的 `input/` 目录并授予读取权限。
3. 在左侧文件列表中点击某个 JSON，查看表格预览与 Provider 预测是否符合预期。
4. 确认无误后再执行 `bun run start` 进行批量合成。

**典型场景**

- 编写对话脚本时，确认 `<#0.5#>` 停顿位置与 `(sighs)` 等标记是否写对。
- 混用 `stylePrompt`（火山）与 `emotion`（MiniMax）时，检查是否误触发了 `mixed/dual` 预测。
- 对比多个 JSON 文件的条目数与角色分布，合成前做一次人工巡检。

## 相关文档

更详细的 API 协议、音色列表与产品设计见 `docs/`：

- `docs/音色列表.md` / `docs/音色列表-简洁.md`
- `docs/豆包语音合成2.0能力介绍.md`
- `docs/WebSocket 单向流式-V3.md`
- `docs/PRD-batch-tts-framework.md`

## 许可证

本项目为个人学习用途，使用前请遵守各 TTS 服务商的服务条款与计费规则。
