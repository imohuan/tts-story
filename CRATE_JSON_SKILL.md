# 批量 TTS JSON 编写说明（v2）

本项目的输入 JSON 同时支持三种 TTS 引擎（provider），它们的参数体系差异较大。
在编写 JSON 前，请先确认你要使用的 provider 模式。

| Provider | 标识 | 核心差异 |
|---|---|---|
| **火山引擎 WebSocket** | `volcengine_ws` | 通过 `stylePrompt` 自然语言控制情绪/风格；角色用 `role` 映射 |
| **MiniMax HTTP** | `minimax_http` | 通过 `text` 内嵌标记 + `options.emotion` 控制情绪；`stylePrompt` 不参与合成 |
| **Edge TTS HTTP** | `edge_tts` | 使用 Azure voice（`speaker`）合成；通过 `options` 覆盖 `style/speed/pitch`；不支持 MiniMax 内嵌标记 |

---

## 1. 通用字段（三种模式共用）

每个 item 都是一个对象，**必须字段**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `text` | `string` | 要合成的文本 |

**可选字段**：

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `role` | `string` | `"narrator"` | 角色键名，由各 provider 的 `roleMap` 映射到对应声音 ID |
| `voiceType` | `string` | — | 直接指定 provider 专用声音 ID，**优先级高于 `role`** |
| `stylePrompt` | `string` | `""` | 声音风格描述（`volcengine_ws` 作为上下文提示；`minimax_http` 与 `edge_tts` 默认不参与合成） |
| `options` | `object` | `{}` | 单条文本的 provider 专属配置覆盖，优先级高于全局 `providerConfig` |

### 角色映射（内置默认）

| 角色键名 | 中文名 | volcengine_ws speaker | minimax_http voiceId | edge_tts speaker |
|---|---|---|---|---|
| `narrator` | 旁白 | `zh_female_vv_uranus_bigtts` | `Chinese (Mandarin)_Reliable_Executive` | `zh-CN-XiaoxiaoNeural` |
| `male_lead` | 男主 | `saturn_zh_male_shuanglangshaonian_tob` | `moss_audio_ee30935b-0221-11f0-a63f-46a1ba410b0e` | `zh-CN-YunxiNeural` |
| `female_lead` | 女主 | `zh_female_vv_uranus_bigtts` | `moss_audio_9e160bff-1c39-11f1-817b-d263514e4b13` | `zh-CN-XiaoyiNeural` |

> 自定义角色推荐写在文件级 `config.roleMap`（与 `config.providerConfig` 同级），也兼容放在 `providerConfig.roleMap`。此外也可在 JSON 中通过 `voiceType` 直接指定声音 ID。

---

## 2. 模式 A：火山引擎 WebSocket（volcengine_ws）

### 工作原理

`stylePrompt` 会作为 `context_texts` 传给火山引擎模型，让模型根据自然语言描述调整音色风格。
情绪、气息、停顿等全部通过 `stylePrompt` 描述控制。

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

建议按以下顺序组织：

1. **基础声线**：性别、年龄感、音调、音色质感、厚薄
2. **发声方式**：发音清晰度、气息稳定度、共鸣感觉
3. **情绪目标**：悲伤/愤怒/克制/崩溃等
4. **可执行参数**：语速、重音词、停顿、句尾处理

推荐模板：

```
男声/女声，青年音色，音调中等（或中高）；音色……，声音厚度……；发音……，气息……；情绪……；语速0.xx，重读"词A/词B"，停顿xxxms，句尾……。
```

### 一致性技巧

- 同一角色的多句，前两段"基础声线"描述尽量**逐字一致**
- 只改"情绪目标"和少量参数（语速、重音、停顿）
- 不要每句都改音色核心词（如"明亮圆润/偏扁平"）

---

## 3. 模式 B：MiniMax HTTP（minimax_http）

> 官方参数文档（异步创建）：<https://platform.minimax.io/docs/api-reference/speech-t2a-async-create.md>

### 工作原理

MiniMax 模式下，`stylePrompt` **不参与合成**，情绪和风格通过以下方式控制：

| 控制维度 | 方式 | 说明 |
|---|---|---|
| **文本输入** | `text` 或 `text_file_id` 二选一 | `text` 最大 50,000 字符；`text_file_id` 最大 1,000,000 字符 |
| **情绪** | `options.voiceSetting.emotion` | 结构化枚举值，非自然语言描述 |
| **停顿** | `text`（或 txt 文件）内嵌 `<#秒数#>` | 如 `<#0.8#>` 插入 0.8 秒停顿 |
| **语气词** | `text` 内嵌标签 | 如 `(laughs)` `(sighs)` `(breath)` |
| **行内注音** | `text` 内嵌括号 | 如 `这个字读(he2)平` |
| **音效** | `options.voiceModify.soundEffects` | 空旷回音、礼堂广播、电话失真、电音 |
| **音色微调** | `options.voiceModify.*` | pitch/timbre/intensity 细调 |

### `text` 与 `text_file_id` 规则

> 默认与推荐：**优先使用 `text`**。仅当文本超长、需要文件批处理或已有上传文件流程时，再使用 `text_file_id`。

| 字段 | 类型 | 要求 | 说明 |
|---|---|---|---|
| `text` | `string` | 必填（二选一） | 转音频文本，最大 50,000 字符；与 `text_file_id` 互斥 |
| `text_file_id` | `integer<int64>` | 必填（二选一） | 文本文件 ID，最大 1,000,000 字符；与 `text` 互斥 |

`text_file_id` 支持格式：

- `txt`：支持 `<#x#>` 停顿标记，`x` 范围 `[0.01, 99.99]`，最多两位小数；必须插在可读文本段之间，且不能连续使用。
- `zip`：压缩包内文件类型必须一致（全是 `txt` 或全是 `json`）。
  - 若为 `json`，支持字段 `"title"`、`"content"`、`"extra"`；每个非空字段会分别生成音频、字幕和元数据，并按文件夹保存。

### text 内嵌标记语法

#### 停顿控制

```
你好<#1.2#>我们继续
```

- `<#x#>` 中的 `x` 为秒数，范围 `[0.01, 99.99]`，最多两位小数
- 不能连续写两个停顿标记

#### 语气词标签（仅 `speech-2.8-hd` / `speech-2.8-turbo` 支持）

| 标签 | 含义 |
|---|---|
| `(laughs)` | 笑声 |
| `(chuckle)` | 轻笑 |
| `(coughs)` | 咳嗽 |
| `(clear-throat)` | 清嗓 |
| `(groans)` | 呻吟/闷哼 |
| `(breath)` | 呼吸声 |
| `(pant)` | 喘息 |
| `(inhale)` | 吸气 |
| `(exhale)` | 呼气 |
| `(gasps)` | 倒吸气 |
| `(sniffs)` | 抽鼻 |
| `(sighs)` | 叹气 |
| `(snorts)` | 哼鼻 |
| `(burps)` | 打嗝 |
| `(lip-smacking)` | 咂嘴 |
| `(humming)` | 哼唱 |
| `(hissing)` | 嘶声 |
| `(emm)` | 嗯（迟疑） |
| `(whistles)` | 吹口哨 |
| `(sneezes)` | 打喷嚏 |
| `(crying)` | 哭泣 |
| `(applause)` | 掌声 |

#### 行内注音

```
这个字读(he2)平，不读(huo4)面
```

支持拼音（带声调数字）、IPA 音标、日语假名/罗马音，可混用。

### JSON 示例

#### 基本用法（只指定角色和情绪）

```json
[
  {
    "text": "老公，人家要抱抱",
    "role": "female_lead",
    "options": {
      "voiceSetting": { "emotion": "happy" }
    }
  },
  {
    "text": "好好好",
    "role": "male_lead",
    "options": {
      "voiceSetting": { "emotion": "calm" }
    }
  }
]
```

#### 使用 text 内嵌标记（停顿 + 语气词）

```json
[
  {
    "text": "我没有背叛你<#0.5#>一直都没有(sighs)",
    "role": "male_lead",
    "options": {
      "voiceSetting": { "emotion": "sad" }
    }
  },
  {
    "text": "那你为什么<#0.3#>一直不解释？",
    "role": "female_lead",
    "options": {
      "voiceSetting": { "emotion": "angry" }
    }
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
  },
  {
    "text": "喂？听得到吗？",
    "role": "male_lead",
    "options": {
      "voiceSetting": { "emotion": "surprised" },
      "voiceModify": { "soundEffects": "lofi_telephone" }
    }
  }
]
```

### options 可用字段速查


#### options.voiceSetting

> pitch 字段 一般情况下不用修改，否则就变成小黄人了，完全失去了原有的配音效果

| 字段 | 类型 | 范围/可选值 | 默认 | 说明 |
|---|---|---|---|---|
| `emotion` | `string` | `happy` / `sad` / `angry` / `fearful` / `disgusted` / `surprised` / `calm` / `fluent` / `whisper` | `calm` | 情绪控制（`whisper` 在 2.8 系列不支持；`fluent`/`whisper` 主要用于 2.6 系列） |
| `speed` | `number` | `[0.5, 2]` | `1` | 语速 |
| `pitch` | `number` | `[-12, 12]` | `0` | 语调。**强制规避：默认不要改这个值。尤其不要为“更少女/更尖/更娇”而设为正数高值；`2`、`3`、`4` 这类值很容易把声音推向失真、发尖、卡通化（例如“小黄人感”）。除非用户明确要求做特殊音色实验，否则生成 JSON 时应省略该字段，优先用 `emotion`、`speed`、停顿和选对 `voiceType` 控制表现。** |
| `vol` | `number` | `(0, 10]` | `1` | 音量 |
| `latexRead` | `boolean` | — | `false` | 朗读 LaTeX（开启后 `language_boost` 自动设为 Chinese） |
| `textNormalization` | `boolean` | — | `false` | 文本规范化（数字/单位读法更自然，略微增加延迟） |

#### options.voiceModify

> `voice_modify`（即 `options.voiceModify`）用于音色与音效微调。仅支持输出音频格式：`mp3`、`wav`、`flac`。`pcm`、`pcmu_raw`、`pcmu_wav`、`opus` 不支持，传入会报参数错误。

| 字段 | 类型 | 范围 | 默认 | 说明 |
|---|---|---|---|---|
| `pitch` | `integer` | `[-100, 100]` | `0` | 对应官方页“低沉/明亮”滑块（负=更低沉，正=更明亮） |
| `intensity` | `integer` | `[-100, 100]` | `0` | 对应官方页“强/柔”滑块（负=更有力量感，正=更柔和） |
| `timbre` | `integer` | `[-100, 100]` | `0` | 对应官方页“浑厚/清脆”滑块（负=更浑厚，正=更清脆） |
| `soundEffects` | `string` | 见下 | `""` | 音效（一次只能选一个） |

参数范围约束：

- `pitch`: `-100 <= x <= 100`
- `intensity`: `-100 <= x <= 100`
- `timbre`: `-100 <= x <= 100`

`soundEffects` 可选值：

| 值 | 效果 |
|---|---|
| `spacious_echo` | 空旷回音 |
| `auditorium_echo` | 礼堂回音 |
| `lofi_telephone` | 电话失真 |
| `robotic` | 机械电音 |
| `""` | 无音效（默认） |

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

`edge_tts` 通过 HTTP 接口调用 Azure voice 进行合成。角色通过 `role`（或 `voiceType`）解析为 `speaker`。
单条可以在 `options` 中覆盖 `style`、`speed`、`pitch`。

### JSON 示例

#### 基本用法

```json
[
  {
    "text": "今天的天气不错。",
    "role": "narrator"
  },
  {
    "text": "我们现在出发。",
    "role": "male_lead"
  }
]
```

#### 单条覆盖参数（style / speed / pitch）

```json
[
  {
    "text": "请系好安全带，列车即将启动。",
    "role": "narrator",
    "options": {
      "style": "newscast",
      "speed": 1.05,
      "pitch": "0"
    }
  },
  {
    "text": "别担心，我会陪着你。",
    "role": "female_lead",
    "options": {
      "style": "calm",
      "speed": 0.95,
      "pitch": "-10"
    }
  }
]
```

### options 可用字段（edge_tts）

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `style` | `string` | `general` | 说话风格 |
| `speed` | `number` | `1.0` | 语速，通常 `0.5 ~ 2.0` |
| `pitch` | `string` | `"0"` | 音调字符串，如 `"0"` / `"25"` / `"-25"` |
| `voice` | `string` | `zh-CN-XiaoxiaoNeural` | 默认 voice（未通过 role/voiceType 指定时使用） |

### 全局配置（providerConfig）

`edge_tts` 还支持在全局 `providerConfig` 中配置以下字段（会作为默认值，单条 `options` 可覆盖）：

| 字段 | 类型 | 默认值 | 对应环境变量 |
|---|---|---|---|
| `baseUrl` | `string` | `https://tts.wangwangit.com` | `EDGE_TTS_BASE_URL` |
| `voice` | `string` | `zh-CN-XiaoxiaoNeural` | `EDGE_TTS_VOICE` |
| `style` | `string` | `general` | `EDGE_TTS_STYLE` |
| `speed` | `number` | `1.0` | `EDGE_TTS_SPEED` |
| `pitch` | `string` | `0` | `EDGE_TTS_PITCH` |
| `roleMap` | `object` | 内置角色表 | — |

示例（文件级 `config.providerConfig`）：

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

### 注意事项

- `edge_tts` 不支持 MiniMax 的 `\u003c#秒数#\u003e`、`(laughs)` 这类内嵌标记。
- `stylePrompt` 在 `edge_tts` 下默认不参与合成，优先使用 `options.style`。

---

## 5. 模式 D：混合模式（按条目自动/显式选择）

当全局 `TTS_PROVIDER=auto` 时，可在**同一份 JSON**中混用多种 provider。
通常不需要在条目里写 `"provider": "auto"`，省略即可按内容自动判断。

### 选择规则（单条 item）

优先级从高到低：

1. `item.provider` 为具体值（`volcengine_ws` / `minimax_http` / `edge_tts`）→ 强制使用该 provider
2. `item.provider = "auto"` → 按条目内容自动判断（可省略）
3. `item.provider` 未设置且全局 `TTS_PROVIDER=auto` → 按条目内容自动判断
4. 自动判断失败 → 回退到全局默认（建议显式写具体 provider 避免歧义）

自动判断特征（当前实现）：

- `stylePrompt` 非空 → `volcengine_ws`
- `options.voiceSetting` / `options.voiceModify` / `options.pronunciationDict` 存在 → `minimax_http`
- `text` 含 `\u003c#秒数#\u003e` 或 `(laughs)` 等内嵌标签 → `minimax_http`
- 其他情况不会自动识别为 `edge_tts`，会回退到全局默认 provider

### 混合模式示例

```json
[
  {
    "text": "我没有背叛你。",
    "role": "male_lead",
    "stylePrompt": "男声，青年音色，语速0.95"
  },
  {
    "text": "那你为什么\u003c#0.3#\u003e一直不解释？",
    "role": "female_lead",
    "options": { "voiceSetting": { "emotion": "angry" } }
  },
  {
    "text": "系统提示：列车即将到站。",
    "role": "narrator",
    "provider": "edge_tts",
    "options": { "style": "newscast", "speed": 1.05 }
  }
]
```

---

## 6. 三种模式差异对照

| 维度 | volcengine_ws | minimax_http | edge_tts |
|---|---|---|---|
| 情绪控制 | `stylePrompt` 自然语言描述 | `options.voiceSetting.emotion` 枚举值 | `options.style` + `speed/pitch` |
| 停顿控制 | `stylePrompt` 描述 | `text` 内嵌 `\u003c#秒数#\u003e` | 不支持内嵌停顿语法 |
| 语气词 | `stylePrompt` 描述 | `text` 内嵌 `(laughs)` `(sighs)` 等 | 不支持语气词标签 |
| 音效 | 不支持 | `options.voiceModify.soundEffects` | 不支持 |
| 音色微调 | 不支持 | `options.voiceModify.pitch/timbre/intensity` | `options.pitch`（字符串） |
| 语速 | `stylePrompt` 描述 | `options.voiceSetting.speed` | `options.speed` |
| 注音 | 不支持 | `text` 内嵌括号注音 + `pronunciationDict` | 不支持 |
| `stylePrompt` | 核心字段，参与合成 | 不参与合成 | 默认不参与合成 |

---

## 7. AI 生成 JSON 时的 Prompt 建议

在让 AI 生成 JSON 前，先确认你要它输出哪一种 **JSON 结构模式**（这里是两种，不是 edge_tts 独有）：

- **模式 1：纯数组模式**（兼容旧流程）
- **模式 2：对象模式**（推荐，便于携带 `config.providerConfig`）

并且建议先导出 provider 的 `roleMap` 结果，一并提供给 AI，避免角色名写错。

先获取角色列表：

```bash
# 导出全部 provider 的 roleMap
bun run export:rolemaps

# 只导出 volcengine_ws 的 roleMap
bun run export:rolemaps --provider volcengine_ws

# 只导出 minimax_http 的 roleMap
bun run export:rolemaps --provider minimax_http

# 只导出 edge_tts 的 roleMap
bun run export:rolemaps --provider edge_tts
```

### A) 两种 JSON 输出结构（给 AI 的统一约束）

#### 模式 1：纯数组模式

```json
[
  { "text": "你好", "role": "narrator" },
  { "text": "我们开始吧", "role": "male_lead" }
]
```

#### 模式 2：对象模式（推荐）

```json
{
  "config": {
    "provider": "volcengine_ws",
    "providerConfig": {}
  },
  "items": [
    { "text": "你好", "role": "narrator" },
    { "text": "我们开始吧", "role": "male_lead" }
  ]
}
```

### B) 三种 provider 的配置示例（对象模式）

#### 1) `volcengine_ws` 配置示例

```json
{
  "config": {
    "provider": "volcengine_ws",
    "providerConfig": {},
    "roleMap": {
      "narrator": { "nameZh": "旁白", "speaker": "zh_female_vv_uranus_bigtts" },
      "male_lead": { "nameZh": "男主", "speaker": "saturn_zh_male_shuanglangshaonian_tob" },
      "female_lead": { "nameZh": "女主", "speaker": "zh_female_vv_uranus_bigtts" }
    }
  },
  "items": [
    {
      "text": "我没有背叛你。",
      "role": "male_lead",
      "stylePrompt": "男声，青年音色，音调中等；发音清晰，气息克制；情绪压抑；语速0.95，句尾短停120ms。"
    }
  ]
}
```

#### 2) `minimax_http` 配置示例

```json
{
  "config": {
    "provider": "minimax_http",
    "providerConfig": {},
    "roleMap": {
      "narrator": { "nameZh": "旁白", "speaker": "Chinese (Mandarin)_Reliable_Executive" },
      "male_lead": { "nameZh": "男主", "speaker": "moss_audio_ee30935b-0221-11f0-a63f-46a1ba410b0e" },
      "female_lead": { "nameZh": "女主", "speaker": "moss_audio_9e160bff-1c39-11f1-817b-d263514e4b13" }
    }
  },
  "items": [
    {
      "text": "那你为什么<#0.3#>一直不解释？",
      "role": "female_lead",
      "options": {
        "voiceSetting": { "emotion": "angry", "speed": 0.95 }
      }
    }
  ]
}
```

#### 3) `edge_tts` 配置示例

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
    {
      "text": "系统提示：列车即将到站。",
      "role": "narrator",
      "options": { "style": "newscast", "speed": 1.05, "pitch": "0" }
    }
  ]
}
```

### C) 可直接复制给 AI 的 prompt 模板

#### 生成 `volcengine_ws` JSON

> 请按【对象模式】生成 TTS 输入 JSON：顶层包含 `config` 与 `items`。
> `config.provider = "volcengine_ws"`，并在 `config.roleMap` 中写入我给出的角色映射（每项结构为 `{ "nameZh": "...", "speaker": "..." }`）。
> 每条 item 包含 `text`、`role`、`stylePrompt`；`stylePrompt` 按“基础声线 + 发声方式 + 情绪目标 + 语速/重读/停顿”格式写。

#### 生成 `minimax_http` JSON

> 请按【对象模式】生成 TTS 输入 JSON：顶层包含 `config` 与 `items`。
> `config.provider = "minimax_http"`，并在 `config.roleMap` 中写入我给出的角色映射（每项结构为 `{ "nameZh": "...", "speaker": "..." }`）。
> 每条 item 在 `text` 与 `text_file_id` 中二选一（默认优先 `text`），并使用 `options.voiceSetting.emotion` 控制情绪。
> 如需停顿，在 `text` 里使用 `<#秒数#>` 标记；不要使用 `stylePrompt` 作为情绪主控制。

#### 生成 `edge_tts` JSON

> 请按【对象模式】生成 TTS 输入 JSON：顶层包含 `config` 与 `items`。
> `config.provider = "edge_tts"`，并在 `config.providerConfig` 中给出 `baseUrl/voice/style/speed/pitch`，在 `config.roleMap` 中给出角色映射（每项结构为 `{ "nameZh": "...", "speaker": "..." }`）。
> 每条 item 包含 `text`、`role`、`options`，通过 `options.style/speed/pitch` 控制风格。
> 不要使用 `<#秒数#>`、`(laughs)` 等 minimax 内嵌标记。

---

## 8. 常见问题

### Q1: 同一批 JSON 可以在三种模式间共用吗？

大部分可以。通用字段（`text`、`role`、`voiceType`）是兼容的。但需要注意：

- `volcengine_ws` 模式下，`options` 中的 minimax/edge 专属字段会被忽略
- `minimax_http` 模式下，`stylePrompt` 不参与合成
- `edge_tts` 模式下，MiniMax 内嵌标记不生效
- 如果 JSON 中同时包含 `stylePrompt` 和 `options`，切换模式时各自生效

### Q2: `stylePrompt` 和 `options` 能同时写吗？

可以，但只有当前模式对应的字段会生效：

- `volcengine_ws`：读 `stylePrompt`
- `minimax_http`：读 `options.voiceSetting/voiceModify/pronunciationDict`
- `edge_tts`：主要读 `options.style/speed/pitch`

### Q3: 情绪控制不够强怎么办？

- **volcengine_ws**：在 `stylePrompt` 中加更具体的描述（重音词、停顿时长、句尾处理）
- **minimax_http**：确保 `emotion` 值正确；组合使用 `speed`、`voiceModify` 微调
- **edge_tts**：优先换 voice（role/voiceType），再调 `style/speed/pitch`

### Q4: 为什么 minimax_http 模式下写了 stylePrompt 没效果？

`stylePrompt` 仅对 `volcengine_ws` 生效。MiniMax 的情绪控制请使用 `options.voiceSetting.emotion`。
