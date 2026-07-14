# 批量 TTS JSON 编写说明

本项目的输入 JSON 同时支持四种 TTS 引擎（provider），参数体系差异较大。编写 JSON 前请先确认使用的 provider。

| Provider | 标识 | 核心差异 |
|---|---|---|
| **火山引擎 WebSocket** | `volcengine_ws` | 通过 `stylePrompt` 自然语言控制风格；角色用 `role` 映射 |
| **MiniMax HTTP** | `minimax_http` | 通过 `text` 内嵌标记 + `options.voiceSetting.emotion` 控制；`stylePrompt` 不参与合成 |
| **Edge TTS HTTP** | `edge_tts` | 使用 Azure voice（`speaker`）合成；通过 `options` 覆盖 `style/speed/pitch` |
| **VoxCPM2 Gradio** | `voxcpm2_gradio` | 通过 Gradio 接口调用，支持声音设计/音频克隆/极致克隆三种模式；角色用 `refWav` 映射参考音频 |

---

## 1. 通用字段（四种模式共用）

每个 item 必须包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| `text` | `string` | **必填**，要合成的文本 |

可选字段：

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `role` | `string` | `"narrator"` | 角色键名，由 roleMap 映射到声音 ID |
| `voiceType` | `string` | — | 直接指定 provider 声音 ID，**优先级高于 `role`** |
| `stylePrompt` | `string` | `""` | 声音风格描述 / 克隆 prompt（volcengine_ws 和 voxcpm2_gradio 使用） |
| `refWav` | `string` | — | 参考音频路径或名称（VoxCPM2 克隆模式使用，匹配 `references_voices/` 目录） |
| `options` | `object` | `{}` | 单条 provider 专属配置覆盖 |
| `provider` | `string` | — | 单条指定 provider，`auto` 为自动检测 |

### 角色映射（内置默认）

| 角色键名 | 中文名 | volcengine_ws | minimax_http | edge_tts | voxcpm2_gradio |
|---|---|---|---|---|---|
| `narrator` | 旁白 | `zh_female_vv_uranus_bigtts` | `Chinese (Mandarin)_Reliable_Executive` | `zh-CN-XiaoxiaoNeural` | `""`（声音设计） |
| `male_lead` | 男主 | `saturn_zh_male_shuanglangshaonian_tob` | `moss_audio_ee30935b-0221-11f0-a63f-46a1ba410b0e` | `zh-CN-YunxiNeural` | `""`（声音设计） |
| `female_lead` | 女主 | `zh_female_vv_uranus_bigtts` | `moss_audio_9e160bff-1c39-11f1-817b-d263514e4b13` | `zh-CN-XiaoyiNeural` | `""`（声音设计） |

> 自定义角色推荐写在文件级 `config.roleMap`。VoxCPM2 的 roleMap 中可配置 `refWav` 指定参考音频文件名（匹配 `references_voices/` 目录），也可通过 `voiceType` 直接指定 speaker。

---

## 2. 模式 A：火山引擎 WebSocket（volcengine_ws）

### 工作原理

`stylePrompt` 作为 `context_texts` 传给火山引擎模型，让模型根据自然语言描述调整音色风格。

### JSON 示例

```json
[
  {
    "text": "我没有背叛你。",
    "role": "male_lead",
    "stylePrompt": "男声，青年音色，音调中等，音色明亮圆润；语速0.95，气息由稳转急，句末短停120ms。"
  },
  {
    "text": "那你为什么一直不解释？",
    "role": "female_lead",
    "stylePrompt": "女声，青年音色，音调中等偏高，清亮柔和但带质问感；语速0.92，重读'为什么'，句尾压低。"
  }
]
```

### stylePrompt 写法指南

只写声音相关指令，不要写角色标签、镜头说明、舞台描述。

建议顺序：**基础声线 → 发声方式 → 情绪目标 → 语速/重读/停顿/句尾处理**

```
男声/女声，青年音色，音调中等（或中高）；音色……，声音厚度……；发音……，气息……；情绪……；语速0.xx，重读"词A/词B"，停顿xxxms，句尾……。
```

### 一致性技巧

- 同一角色的多句，前两段"基础声线"描述尽量**逐字一致**
- 只改"情绪目标"和少量参数
- 不要每句都改音色核心词

---

## 3. 模式 B：MiniMax HTTP（minimax_http）

> 官方参数文档：<https://platform.minimax.io/docs/api-reference/speech-t2a-async-create.md>

### 工作原理

`stylePrompt` 不参与合成，情绪和风格通过以下方式控制：

| 控制维度 | 方式 |
|---|---|
| 情绪 | `options.voiceSetting.emotion` 枚举值 |
| 停顿 | `text` 内嵌 `<#秒数#>` |
| 语气词 | `text` 内嵌 `(laughs)` `(sighs)` 等标签 |
| 行内注音 | `text` 内嵌括号注音 |
| 音效 | `options.voiceModify.soundEffects` |
| 音色微调 | `options.voiceModify.*` |

### JSON 示例

#### 基本用法

```json
[
  {
    "text": "老公，人家要抱抱",
    "role": "female_lead",
    "options": { "voiceSetting": { "emotion": "happy" } }
  },
  {
    "text": "好好好",
    "role": "male_lead",
    "options": { "voiceSetting": { "emotion": "calm" } }
  }
]
```

#### 停顿 + 语气词

```json
[
  {
    "text": "我没有背叛你<#0.5#>一直都没有(sighs)",
    "role": "male_lead",
    "options": { "voiceSetting": { "emotion": "sad" } }
  },
  {
    "text": "那你为什么<#0.3#>一直不解释？",
    "role": "female_lead",
    "options": { "voiceSetting": { "emotion": "angry" } }
  }
]
```

#### 音效 + 音色微调

```json
[
  {
    "text": "各位旅客请注意",
    "role": "narrator",
    "options": {
      "voiceSetting": { "emotion": "calm", "speed": 0.9 },
      "voiceModify": { "soundEffects": "auditorium_echo" }
    }
  }
]
```

### text 内嵌标记语法

#### 停顿控制

`你好<#1.2#>我们继续` — `x` 范围 `[0.01, 99.99]`，最多两位小数，不能连续使用。

#### 语气词标签（仅 `speech-2.8-hd` / `speech-2.8-turbo` 支持）

`(laughs)` `(chuckle)` `(coughs)` `(clear-throat)` `(groans)` `(breath)` `(pant)` `(inhale)` `(exhale)` `(gasps)` `(sniffs)` `(sighs)` `(snorts)` `(burps)` `(lip-smacking)` `(humming)` `(hissing)` `(emm)` `(whistles)` `(sneezes)` `(crying)` `(applause)`

#### 行内注音

`这个字读(he2)平，不读(huo4)面` — 支持拼音（带声调数字）、IPA 音标、日语假名/罗马音。

### `text` 与 `text_file_id` 规则

优先使用 `text`。仅当文本超长或需要文件批处理时用 `text_file_id`。

| 字段 | 类型 | 说明 |
|---|---|---|
| `text` | `string` | 最大 50,000 字符；与 `text_file_id` 互斥 |
| `text_file_id` | `integer` | 文本文件 ID，最大 1,000,000 字符；与 `text` 互斥 |

### options 字段速查

#### options.voiceSetting

| 字段 | 类型 | 范围/可选值 | 默认 | 说明 |
|---|---|---|---|---|
| `emotion` | `string` | `happy` / `sad` / `angry` / `fearful` / `disgusted` / `surprised` / `calm` / `fluent` / `whisper` | `calm` | 情绪控制 |
| `speed` | `number` | `[0.5, 2]` | `1` | 语速 |
| `pitch` | `number` | `[-12, 12]` | `0` | 语调。**默认不要改**，容易失真变"小黄人"。优先用 `emotion`、`speed`、停顿和 `voiceType` 控制表现 |
| `vol` | `number` | `(0, 10]` | `1` | 音量 |
| `latexRead` | `boolean` | — | `false` | 朗读 LaTeX |
| `textNormalization` | `boolean` | — | `false` | 文本规范化 |

#### options.voiceModify

| 字段 | 类型 | 范围 | 默认 | 说明 |
|---|---|---|---|---|
| `pitch` | `int` | `[-100, 100]` | `0` | 低沉/明亮 |
| `intensity` | `int` | `[-100, 100]` | `0` | 强/柔 |
| `timbre` | `int` | `[-100, 100]` | `0` | 浑厚/清脆 |
| `soundEffects` | `string` | `spacious_echo` / `auditorium_echo` / `lofi_telephone` / `robotic` / `""` | `""` | 音效 |

#### options.pronunciationDict

```json
{
  "options": {
    "pronunciationDict": {
      "tone": ["燕少飞/(yan4)(shao3)(fei1)", "omg/oh my god"]
    }
  }
}
```

---

## 4. 模式 C：Edge TTS HTTP（edge_tts）

### 工作原理

通过 HTTP 接口调用 Azure voice。不支持 MiniMax 内嵌标记和 `stylePrompt`。

### JSON 示例

```json
[
  {
    "text": "今天的天气不错。",
    "role": "narrator"
  },
  {
    "text": "请系好安全带，列车即将启动。",
    "role": "narrator",
    "options": { "style": "newscast", "speed": 1.05 }
  }
]
```

### options 可用字段

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `style` | `string` | `general` | 说话风格 |
| `speed` | `number` | `1.0` | 语速，`0.5 ~ 2.0` |
| `pitch` | `string` | `"0"` | 音调 |
| `voice` | `string` | `zh-CN-XiaoxiaoNeural` | 默认 voice |

### 全局 providerConfig

```json
{
  "config": {
    "provider": "edge_tts",
    "providerConfig": {
      "baseUrl": "https://tts.wangwangit.com",
      "voice": "zh-CN-XiaoxiaoNeural",
      "style": "general",
      "speed": 1,
      "pitch": "0"
    },
    "roleMap": {
      "narrator": { "nameZh": "旁白", "speaker": "zh-CN-XiaoxiaoNeural" },
      "male_lead": { "nameZh": "男主", "speaker": "zh-CN-YunxiNeural" },
      "female_lead": { "nameZh": "女主", "speaker": "zh-CN-XiaoyiNeural" }
    }
  },
  "items": [
    { "text": "你好", "role": "narrator" }
  ]
}
```

| 字段 | 默认值 | 环境变量 |
|---|---|---|
| `baseUrl` | `https://tts.wangwangit.com` | `EDGE_TTS_BASE_URL` |
| `voice` | `zh-CN-XiaoxiaoNeural` | `EDGE_TTS_VOICE` |
| `style` | `general` | `EDGE_TTS_STYLE` |
| `speed` | `1.0` | `EDGE_TTS_SPEED` |
| `pitch` | `0` | `EDGE_TTS_PITCH` |

---

## 5. 模式 D：VoxCPM2 Gradio（voxcpm2_gradio）

> 完整 API 参考：`docs/VoxCPM2 API_REFERENCE.md`

### 工作原理

通过 `@gradio/client` 直连 VoxCPM2 Gradio 服务，根据参数自动判断合成模式。

VoxCPM2 **不支持并发**（服务端 `concurrency_limit=1`），建议将 `--concurrency` 设为 `1`。

### 三种合成模式

| 模式 | 条件 | 说明 |
|---|---|---|
| **声音设计** | 有 `stylePrompt`，无 `refWav` | 用自然语言描述声音特征，模型直接合成 |
| **纯音频克隆** | 有 `refWav`，无 `stylePrompt` | 根据参考音频克隆音色 |
| **极致克隆** | 有 `refWav` + `stylePrompt` | 参考音频 + 其文本内容，效果最佳 |

参考音频放在 `references_voices/` 目录下，可在 `roleMap` 中通过 `refWav` 字段指定文件名（不含后缀会自动匹配）。

### JSON 示例

```json
{
  "config": {
    "provider": "voxcpm2_gradio",
    "roleMap": {
      "narrator": { "nameZh": "旁白" },
      "male_lead": { "nameZh": "男主" },
      "female_lead": { "nameZh": "女主" },
      "sweet_girl": { "nameZh": "甜妹", "refWav": "甜妹" }
    }
  },
  "items": [
    {
      "text": "你好呀，今天天气真不错，我们一起去公园散步吧。",
      "stylePrompt": "温柔甜美的年轻女孩，语速适中，声音明亮"
    },
    {
      "text": "各位听众朋友们，欢迎收听今天的节目。",
      "stylePrompt": "沉稳专业的中年男性，语速稍慢，声音浑厚"
    },
    {
      "text": "大家好，我是你们的新朋友，很高兴认识大家。",
      "role": "sweet_girl"
    },
    {
      "text": "这个是用来测试极致克隆模式的效果。",
      "role": "sweet_girl",
      "stylePrompt": "大家好我是甜妹今天来给大家唱首歌"
    }
  ]
}
```

### item 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `text` | `string` | **必填**，要合成的文本 |
| `stylePrompt` | `string` | 声音描述（声音设计模式）或参考音频文本（极致克隆模式） |
| `refWav` | `string` | 参考音频路径或 `references_voices/` 下的文件名（不含后缀） |
| `role` | `string` | 角色键名，可通过 `roleMap` 批量设置 `refWav` |

### 配置参数

| 参数 | 环境变量 | 默认值 | 说明 |
|---|---|---|---|
| `host` | `VOXCPM2_HOST` | `localhost:8808` | Gradio 服务地址 |
| `cfgValue` | `VOXCPM2_CFG_VALUE` | `2.0` | CFG 引导强度，范围 `[1.0, 3.0]` |
| `doNormalize` | `VOXCPM2_DO_NORMALIZE` | `false` | 是否归一化 |
| `denoise` | `VOXCPM2_DENOISE` | `false` | 是否降噪 |
| `ditSteps` | `VOXCPM2_DIT_STEPS` | `10` | DIT 推理步数，越大质量越好但越慢 |

可在文件级 `providerConfig` 中覆盖：

```json
{
  "config": {
    "provider": "voxcpm2_gradio",
    "providerConfig": {
      "host": "192.168.1.100:8808",
      "cfgValue": 2.5,
      "denoise": true
    }
  },
  "items": [...]
}
```

也可在单条 `options` 中覆盖：

```json
{
  "text": "...",
  "options": { "cfgValue": 3.0, "ditSteps": 20 }
}
```

### `.env` 配置

```env
VOXCPM2_HOST=localhost:8808
VOXCPM2_CFG_VALUE=2.0
VOXCPM2_DO_NORMALIZE=false
VOXCPM2_DENOISE=false
VOXCPM2_DIT_STEPS=10
```

---

## 6. 模式 E：混合模式（按条目自动/显式选择）

当全局 `TTS_PROVIDER=auto` 时，可在**同一份 JSON** 中混用多种 provider。

### 选择规则（单条 item）

优先级从高到低：

1. `item.provider` 为具体值 → 强制使用该 provider
2. `item.provider = "auto"` → 按内容自动判断
3. 未设置且全局为 `auto` → 按内容自动判断
4. 无法判断 → 回退到全局默认

自动判断特征：

- `stylePrompt` 非空 + 无 `refWav` → `volcengine_ws`
- `refWav` 非空 → `voxcpm2_gradio`
- `options.voiceSetting` / `options.voiceModify` / `options.pronunciationDict` 存在 → `minimax_http`
- `text` 含 `<#秒数#>` 或 `(laughs)` 等标签 → `minimax_http`
- 其他 → 回退到全局默认

### 混合模式示例

```json
[
  {
    "text": "我没有背叛你。",
    "role": "male_lead",
    "stylePrompt": "男声，青年音色，语速0.95"
  },
  {
    "text": "那你为什么<#0.3#>一直不解释？",
    "role": "female_lead",
    "options": { "voiceSetting": { "emotion": "angry" } }
  },
  {
    "text": "系统提示：列车即将到站。",
    "role": "narrator",
    "provider": "edge_tts",
    "options": { "style": "newscast", "speed": 1.05 }
  },
  {
    "text": "这是用参考音频克隆的声音。",
    "role": "sweet_girl"
  }
]
```

---

## 7. 四种模式差异对照

| 维度 | volcengine_ws | minimax_http | edge_tts | voxcpm2_gradio |
|---|---|---|---|---|
| 情绪控制 | `stylePrompt` 自然语言 | `options.voiceSetting.emotion` 枚举 | `options.style` | `stylePrompt` 自然语言 |
| 停顿控制 | `stylePrompt` 描述 | `text` 内嵌 `<#秒数#>` | 不支持 | 不支持 |
| 语气词 | `stylePrompt` 描述 | `text` 内嵌 `(laughs)` 等 | 不支持 | 不支持 |
| 音效 | 不支持 | `options.voiceModify.soundEffects` | 不支持 | 不支持 |
| 音色克隆 | 不支持 | 不支持 | 不支持 | `refWav` 参考音频 |
| 语速 | `stylePrompt` 描述 | `options.voiceSetting.speed` | `options.speed` | `stylePrompt` 描述 |
| 调用方式 | WebSocket 流式 | HTTP 非流式 | HTTP | Gradio 客户端 |
| 并发 | 支持 | 支持 | 支持 | 不支持（串行） |

---

## 8. AI 生成 JSON 时的 Prompt 建议

先确认 JSON 结构模式：

- **模式 1：纯数组** — `[{...}, {...}]`
- **模式 2：对象模式（推荐）** — `{ "config": {...}, "items": [...] }`

建议先导出 `roleMap`，一并提供给 AI：

```bash
bun run export:rolemaps --provider volcengine_ws
bun run export:rolemaps --provider minimax_http
bun run export:rolemaps --provider edge_tts
```

### 对象模式示例

```json
{
  "config": {
    "provider": "volcengine_ws",
    "providerConfig": {},
    "roleMap": {
      "narrator": { "nameZh": "旁白", "speaker": "zh_female_vv_uranus_bigtts" },
      "male_lead": { "nameZh": "男主", "speaker": "saturn_zh_male_shuanglangshaonian_tob" }
    }
  },
  "items": [
    { "text": "你好", "role": "narrator" },
    { "text": "我们开始吧", "role": "male_lead" }
  ]
}
```

### Prompt 模板

**volcengine_ws：**
> 按对象模式生成 TTS JSON。`config.provider = "volcengine_ws"`。每条 item 包含 `text`、`role`、`stylePrompt`（基础声线 + 发声方式 + 情绪目标 + 语速/重读/停顿）。

**minimax_http：**
> 按对象模式生成 TTS JSON。`config.provider = "minimax_http"`。每条 item 使用 `options.voiceSetting.emotion` 控制情绪，停顿用 `<#秒数#>` 标记。不要使用 `stylePrompt`。

**edge_tts：**
> 按对象模式生成 TTS JSON。`config.provider = "edge_tts"`。通过 `options.style/speed/pitch` 控制。不要使用 `<#秒数#>`、`(laughs)` 等标记。

**voxcpm2_gradio：**
> 按对象模式生成 TTS JSON。`config.provider = "voxcpm2_gradio"`。声音设计模式使用 `stylePrompt` 描述声音；克隆模式在 `roleMap` 中通过 `refWav` 指定 `references_voices/` 下的参考音频文件名。不要使用 MiniMax 的 `<#秒数#>` 或 `(laughs)` 标记。

---

## 9. 常见问题

### Q1: 同一批 JSON 可以在不同模式间共用吗？

大部分可以。通用字段兼容，但：

- `volcengine_ws`：忽略 minimax/edge 专属 `options`
- `minimax_http`：无视 `stylePrompt`
- `edge_tts`：MiniMax 内嵌标记不生效
- `voxcpm2_gradio`：Minimax 内嵌标记不生效，`refWav` 在其他 provider 下被忽略

### Q2: `stylePrompt` 和 `options` 能同时写吗？

可以，但只有当前模式对应的字段会生效。

### Q3: 情绪控制不够强怎么办？

- **volcengine_ws**：`stylePrompt` 加更具体描述（重音词、停顿时长、句尾处理）
- **minimax_http**：确保 `emotion` 正确，组合 `speed`、`voiceModify` 微调
- **edge_tts**：优先换 voice，再调 `style/speed/pitch`
- **voxcpm2_gradio**：调整 `cfgValue`（增大引导强度）或换参考音频

### Q4: 为什么 minimax_http 下写了 stylePrompt 没效果？

`stylePrompt` 仅对 `volcengine_ws` 和 `voxcpm2_gradio` 生效。MiniMax 用 `options.voiceSetting.emotion`。

### Q5: VoxCPM2 提示连接失败？

确认 Gradio 服务已启动：`http://{host}:8808` 可访问。检查 `.env` 中 `VOXCPM2_HOST` 是否正确。
