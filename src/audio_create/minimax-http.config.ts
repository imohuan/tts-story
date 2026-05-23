// ════════════════════════════════════════════════════════════
// MiniMax TTS HTTP API - 默认配置
// 对应接口: /v1/t2a_v2（非流式）
// ════════════════════════════════════════════════════════════

import { envString, type RoleMap } from "../config";

/**
 * MiniMax HTTP 默认角色映射表
 * 角色键名 → { 中文名, voiceId }
 */
export const MINIMAX_HTTP_DEFAULT_ROLE_MAP: RoleMap = {
  narrator: {
    nameZh: "旁白",
    speaker: "Chinese (Mandarin)_Reliable_Executive",
  },
  male_lead: {
    nameZh: "男主",
    speaker: "moss_audio_ee30935b-0221-11f0-a63f-46a1ba410b0e",
  },
  female_lead: {
    nameZh: "女主",
    speaker: "moss_audio_9e160bff-1c39-11f1-817b-d263514e4b13",
  },
  "Chinese (Mandarin)_Reliable_Executive": {
    nameZh: "可靠男声 - 低沉、浑厚、温暖",
    speaker: "Chinese (Mandarin)_Reliable_Executive",
  },
  "Chinese (Mandarin)_News_Anchor": {
    nameZh: "新闻主播 - 干练、干脆、浑厚",
    speaker: "Chinese (Mandarin)_News_Anchor",
  },
  "Chinese (Mandarin)_Unrestrained_Young_Man": {
    nameZh: "不羁青年 - 有磁性、低沉、冷峻",
    speaker: "Chinese (Mandarin)_Unrestrained_Young_Man",
  },
  "Chinese (Mandarin)_Mature_Woman": {
    nameZh: "成熟女性 - 丝绒感、妩媚、低沉",
    speaker: "Chinese (Mandarin)_Mature_Woman",
  },
  Arrogant_Miss: {
    nameZh: "傲娇小姐 - 明亮、跳脱、俏皮",
    speaker: "Arrogant_Miss",
  },
  "Chinese (Mandarin)_Kind-hearted_Antie": {
    nameZh: "热心阿姨 - 温暖、朴实、有质感",
    speaker: "Chinese (Mandarin)_Kind-hearted_Antie",
  },
  Robot_Armor: {
    nameZh: "机甲装甲 - 清晰、得体、浑厚",
    speaker: "Robot_Armor",
  },
  hunyin_6: {
    nameZh: "清爽青年 - 清晰、沉稳、有磁性",
    speaker: "hunyin_6",
  },
  "Chinese (Mandarin)_HK_Flight_Attendant": {
    nameZh: "港风空姐 - 明亮、轻快、浑厚",
    speaker: "Chinese (Mandarin)_HK_Flight_Attendant",
  },
  "Chinese (Mandarin)_Humorous_Elder": {
    nameZh: "幽默长者 - 沙哑、温暖、有质感",
    speaker: "Chinese (Mandarin)_Humorous_Elder",
  },
  "Chinese (Mandarin)_Gentleman": {
    nameZh: "绅士男声 - 温暖、顺滑、轻盈",
    speaker: "Chinese (Mandarin)_Gentleman",
  },
  "Chinese (Mandarin)_Warm_Bestie": {
    nameZh: "暖心闺蜜 - 柔和、轻盈、温暖",
    speaker: "Chinese (Mandarin)_Warm_Bestie",
  },
  "Chinese (Mandarin)_Stubborn_Friend": {
    nameZh: "倔强朋友 - 温暖、有质感、浑厚",
    speaker: "Chinese (Mandarin)_Stubborn_Friend",
  },
  "Chinese (Mandarin)_Sweet_Lady": {
    nameZh: "甜美女声 - 甜美、明亮、轻盈",
    speaker: "Chinese (Mandarin)_Sweet_Lady",
  },
  "moss_audio_9c223de9-7ce1-11f0-9b9f-463feaa3106a": {
    nameZh: "沉思瑞恩 - 清晰、流畅、有感染力",
    speaker: "moss_audio_9c223de9-7ce1-11f0-9b9f-463feaa3106a",
  },
  "Chinese (Mandarin)_Southern_Young_Man": {
    nameZh: "南方青年 - 温柔、顺滑、温暖",
    speaker: "Chinese (Mandarin)_Southern_Young_Man",
  },
  "moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85": {
    nameZh: "可信亚历克斯 - 低沉、从容、引导型",
    speaker: "moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85",
  },
  "Chinese (Mandarin)_Wise_Women": {
    nameZh: "睿智女士 - 温暖、柔和、温柔",
    speaker: "Chinese (Mandarin)_Wise_Women",
  },
  "moss_audio_3dee3d0c-7ce6-11f0-8ff8-2a857e2646d2": {
    nameZh: "警觉薇洛 - 明亮、流畅、建议型",
    speaker: "moss_audio_3dee3d0c-7ce6-11f0-8ff8-2a857e2646d2",
  },
  "Chinese (Mandarin)_Gentle_Youth": {
    nameZh: "温柔少年 - 顺滑、轻盈、温暖",
    speaker: "Chinese (Mandarin)_Gentle_Youth",
  },
  "moss_audio_aaa1346a-7ce7-11f0-8e61-2e6e3c7ee85d": {
    nameZh: "务实格蕾丝 - 明亮、语速快、直率",
    speaker: "moss_audio_aaa1346a-7ce7-11f0-8e61-2e6e3c7ee85d",
  },
  "Chinese (Mandarin)_Warm_Girl": {
    nameZh: "暖心女孩 - 甜美、轻盈、顺滑",
    speaker: "Chinese (Mandarin)_Warm_Girl",
  },
  "Chinese (Mandarin)_Male_Announcer": {
    nameZh: "男声播报员 - 浑厚、干练、温暖",
    speaker: "Chinese (Mandarin)_Male_Announcer",
  },
  "Chinese (Mandarin)_Kind-hearted_Elder": {
    nameZh: "亲切长者 - 沧桑、温暖、温柔",
    speaker: "Chinese (Mandarin)_Kind-hearted_Elder",
  },
  "Chinese (Mandarin)_Cute_Spirit": {
    nameZh: "可爱精灵 - 高音、明亮、甜美",
    speaker: "Chinese (Mandarin)_Cute_Spirit",
  },
  "Chinese (Mandarin)_Radio_Host": {
    nameZh: "电台主持 - 干脆、有活力、明亮",
    speaker: "Chinese (Mandarin)_Radio_Host",
  },
  "Chinese (Mandarin)_Lyrical_Voice": {
    nameZh: "抒情旁白 - 低沉、顺滑、浑厚",
    speaker: "Chinese (Mandarin)_Lyrical_Voice",
  },
  "Chinese (Mandarin)_Straightforward_Boy": {
    nameZh: "直率少年 - 明亮、清晰、少年感",
    speaker: "Chinese (Mandarin)_Straightforward_Boy",
  },
  "Chinese (Mandarin)_Sincere_Adult": {
    nameZh: "真诚男声 - 温暖、温柔、顺滑",
    speaker: "Chinese (Mandarin)_Sincere_Adult",
  },
  "Chinese (Mandarin)_Gentle_Senior": {
    nameZh: "温柔长者 - 温暖、柔和、成熟",
    speaker: "Chinese (Mandarin)_Gentle_Senior",
  },
};

export type MiniMaxHttpConfig = {
  // ── 鉴权 ────────────────────────────────────────────────
  /**
   * API Key（Authorization: Bearer <apiKey>）
   */
  apiKey: string;

  // ── 接口 ────────────────────────────────────────────────
  /**
   * TTS 接口地址
   * 非流式: .../t2a_v2
   * 流式:   .../t2a_v2 (stream=true)
   */
  endpoint: string;

  // ── 模型 ────────────────────────────────────────────────
  /**
   * 模型名称
   * 可选：speech-2.8-hd / speech-2.8-turbo / speech-2.6-hd / speech-2.6-turbo
   *        speech-02-hd / speech-02-turbo / speech-01-hd / speech-01-turbo
   */
  model: string;

  /**
   * 是否流式输出（默认 false）
   * 注意：stream=true 时 output_format 仅支持 hex
   */
  stream: boolean;

  // ── 声音基础设置 ────────────────────────────────────────
  voiceSetting: {
    /**
     * 音色 ID（必填；系统音色或复刻音色）
     */
    voiceId: string;
    /**
     * 音量，范围 (0,10]（默认 1）
     */
    vol: number;
    /**
     * 语调，范围 [-12,12]（默认 0）
     */
    pitch: number;
    /**
     * 语速，范围 [0.5,2]（默认 1）
     */
    speed: number;
    /**
     * 情绪控制
     * 可选：happy=高兴 / sad=悲伤 / angry=愤怒 / fearful=害怕 / disgusted=厌恶
     *       surprised=惊讶 / calm=平静 / fluent=生动 / whisper=低语
     * 兼容提示：whisper 在 2.8 系列不支持；fluent/whisper 主要用于 2.6 系列
     */
    emotion: string;
    /**
     * 是否朗读 LaTeX（默认 false）
     * 开启后 language_boost 会被设为 Chinese；文本里的 \ 需要写成 \\（转义）
     */
    latexRead: boolean;
    /**
     * 是否启用文本规范化（默认 false）
     * 开启后数字/单位/部分缩写通常读得更自然，但会略微增加延迟
     */
    textNormalization: boolean;
  };

  // ── 发音词典 ────────────────────────────────────────────
  /**
   * 用于"强制指定某些词怎么读"，防止模型读错多音字、缩写词、外语词
   * 每项格式："原词/目标读法"
   * 右侧"目标读法"支持：普通文本、拼音(带声调数字)、IPA(音标)、日语假名/罗马音，可混用
   * - 中文注音示例："燕少飞/(yan4)(shao3)(fei1)"，数字 1/2/3/4/5 = 一/二/三/四/轻声
   * - IPA 示例："resume/(rɪˈzjuːm)"
   * - 日语示例："東京/トウキョウ"
   * - 替换读法示例："omg/oh my god"
   * 常见坑：必须包含斜杠 / 作为分隔；一条规则建议只管一个词
   */
  pronunciationDict: {
    tone: string[];
  };

  // ── 音色细调 ────────────────────────────────────────────
  /**
   * 在"同一个 voice_id"基础上再做风格微调
   * 可以理解成给当前音色加滤镜：不换人声，只改变听感
   */
  voiceModify: {
    /**
     * 控制亮/暗倾向，范围 [-100,100]
     * 负数：更低沉；正数：更明亮；0：不改
     */
    pitch: number;
    /**
     * 控制厚/脆倾向，范围 [-100,100]
     * 负数：更浑厚；正数：更清脆；0：不改
     */
    timbre: number;
    /**
     * 控制硬/柔倾向，范围 [-100,100]
     * 负数：更有力量感；正数：更柔和；0：不改
     */
    intensity: number;
    /**
     * 额外音效（一次只能选一个）
     * 可选：spacious_echo（空旷回音）、auditorium_echo（礼堂广播）
     *       lofi_telephone（电话失真）、robotic（电音）
     * 不启用设为空字符串
     */
    soundEffects: string;
  };

  // ── 音频输出设置 ────────────────────────────────────────
  audioSetting: {
    /**
     * 输出格式
     * 可选：mp3、pcm、flac、wav、pcmu_raw、pcmu_wav、opus
     * 注意：wav 仅非流式支持；pcmu_raw/pcmu_wav 是 G.711 μ-law（8k）
     */
    format: string;
    /**
     * 码率（仅 mp3 生效）
     * 可选值：32000 / 64000 / 128000 / 256000
     * 数值越大，通常音质越好、文件越大
     */
    bitrate: number;
    /**
     * 声道数。1=单声道，2=双声道（立体声）
     * 可选值：1 / 2（默认 1）
     */
    channel: number;
    /**
     * 是否固定码率（仅 stream=true 且 mp3 时有效）
     */
    forceCbr: boolean;
    /**
     * 采样率（每秒采样次数）
     * 可选值：8000 / 16000 / 22050 / 24000 / 32000 / 44100
     */
    sampleRate: number;
  };

  // ── 输出格式 ────────────────────────────────────────────
  /**
   * 非流式时输出格式（默认 hex）
   * - hex：直接返回十六进制音频数据
   * - url：返回临时下载链接（通常 24 小时有效）
   * 注意：stream=true 时仅支持 hex
   */
  outputFormat: string;

  /**
   * 是否在音频末尾添加节奏标识（仅非流式有效）
   */
  aigcWatermark: boolean;

  /**
   * 语言增强
   * - auto：让模型自动判断（新手推荐）
   * - 手动填：Chinese, Chinese,Yue, English, Arabic, Russian, Spanish, French,
   *   Portuguese, German, Turkish, Dutch, Ukrainian, Vietnamese, Indonesian,
   *   Japanese, Italian, Korean, Thai, Polish, Romanian, Greek, Czech, Finnish,
   *   Hindi, Bulgarian, Danish, Hebrew, Malay, Persian, Slovak, Swedish,
   *   Croatian, Filipino, Hungarian, Norwegian, Slovenian, Catalan, Nynorsk,
   *   Tamil, Afrikaans, auto
   * 兼容提示：speech-01 / speech-02 系列暂不支持 Persian / Filipino / Tamil
   */
  languageBoost: string;

  // ── 流式输出附加选项 ────────────────────────────────────
  streamOptions: {
    /**
     * false = 最后一个分片附带"完整拼接音频"（新手更省心）
     * true  = 最后一个分片不附带完整音频（适合自行拼接，减少重复数据）
     */
    excludeAggregatedAudio: boolean;
  };

  /**
   * 让句子和句子衔接更自然（默认 false）
   * 体感：开了以后停顿会更顺，不容易有"每句都重新起读"的断裂感
   * 仅 speech-2.8-hd / speech-2.8-turbo 支持
   */
  continuousSound: boolean;

  /**
   * 是否生成字幕信息（默认 false）
   * 仅"非流式"请求有效，且只在部分模型上支持
   */
  subtitleEnable: boolean;

  /**
   * 字幕粒度
   * - sentence：句级时间戳
   * - word：词级时间戳
   * - word_streaming：面向流式的词级时间戳（仅 stream=true 有效）
   */
  subtitleType: string;

  // ── 角色映射 ──────────────────────────────────────────
  /**
   * 角色名 → (中文名, MiniMax voiceId) 映射表
   * 内置默认：narrator(旁白) / male_lead(男主) / female_lead(女主)
   * 用户可扩展自定义角色，如 "villain": { nameZh: "反派", speaker: "some_voice_id" }
   */
  roleMap: RoleMap;
};

/**
 * MiniMax HTTP TTS 默认配置
 * env 中可覆盖 MINIMAX_API_KEY、MINIMAX_ENDPOINT，其余参数在此调整
 */
export function getMiniMaxHttpDefaults(): MiniMaxHttpConfig {
  return {
    // 鉴权 — 从 .env 读取
    apiKey: envString("MINIMAX_API_KEY", ""),

    // 接口 — 从 .env 读取
    endpoint: envString(
      "MINIMAX_ENDPOINT",
      "https://yunwu.ai/minimax/v1/t2a_v2",
    ),

    // 模型
    model: "speech-2.8-hd",
    stream: false,

    // 声音基础设置
    voiceSetting: {
      voiceId: "moss_audio_9e160bff-1c39-11f1-817b-d263514e4b13",
      vol: 1,
      pitch: 0,
      speed: 1,
      emotion: "calm",
      latexRead: false,
      textNormalization: false,
    },

    // 发音词典
    pronunciationDict: {
      tone: [],
    },

    // 音色细调
    voiceModify: {
      pitch: 0,
      timbre: 0,
      intensity: 0,
      soundEffects: "",
    },

    // 音频输出设置
    audioSetting: {
      format: "mp3",
      bitrate: 128000,
      channel: 1,
      forceCbr: false,
      sampleRate: 32000,
    },

    // 输出格式
    outputFormat: "hex",
    aigcWatermark: false,
    languageBoost: "auto",

    // 流式输出附加选项
    streamOptions: {
      excludeAggregatedAudio: false,
    },

    // 其他
    continuousSound: true,
    subtitleEnable: false,
    subtitleType: "sentence",

    // 角色映射
    roleMap: MINIMAX_HTTP_DEFAULT_ROLE_MAP,
  };
}

/**
 * 构建 MiniMax t2a_v2 请求体 *
 * @param text 待合成文本（文档要求 < 10000 字符；>3000 建议流式）
 * 额外能力：
 * 1) 停顿控制：可写 <#x#>，x 为秒数，范围 [0.01,99.99]，最多两位小数，且不能连续写两个停顿标记
 *    示例："你好<#1.2#>我们继续" = 中间停顿 1.2 秒
 * 2) 行内注音：可在词后写半角括号注音（拼音/IPA/粤拼）覆盖默认读音
 *    示例："这个字读(he2)平，不读(huo4)面"
 * 3) 语气词标签：如 (laughs)/(sighs)/(breath)（2.8-hd / 2.8-turbo 支持）
 *    英文→中文示例：
 *    laughs=笑、chuckle=轻笑、sighs=叹气、breath=呼吸声、coughs=咳嗽、gasps=倒吸气 */
export function buildMiniMaxRequestBody(
  text: string,
  config: MiniMaxHttpConfig,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: config.model,
    text,
    stream: config.stream,
    voice_setting: {
      voice_id: config.voiceSetting.voiceId,
      vol: config.voiceSetting.vol,
      pitch: config.voiceSetting.pitch,
      speed: config.voiceSetting.speed,
      emotion: config.voiceSetting.emotion,
      latex_read: config.voiceSetting.latexRead,
      text_normalization: config.voiceSetting.textNormalization,
    },
    audio_setting: {
      format: config.audioSetting.format,
      bitrate: config.audioSetting.bitrate,
      channel: config.audioSetting.channel,
      force_cbr: config.audioSetting.forceCbr,
      sample_rate: config.audioSetting.sampleRate,
    },
    output_format: config.outputFormat,
    aigc_watermark: config.aigcWatermark,
    language_boost: config.languageBoost,
    continuous_sound: config.continuousSound,
    subtitle_enable: config.subtitleEnable,
  };

  // 发音词典（仅在有规则时发送）
  if (config.pronunciationDict.tone.length > 0) {
    body.pronunciation_dict = { tone: config.pronunciationDict.tone };
  }

  // 音色细调（有非零值时发送）
  if (
    config.voiceModify.pitch !== 0 ||
    config.voiceModify.timbre !== 0 ||
    config.voiceModify.intensity !== 0 ||
    config.voiceModify.soundEffects
  ) {
    const vm: Record<string, unknown> = {
      pitch: config.voiceModify.pitch,
      timbre: config.voiceModify.timbre,
      intensity: config.voiceModify.intensity,
    };
    if (config.voiceModify.soundEffects) {
      vm.sound_effects = config.voiceModify.soundEffects;
    }
    body.voice_modify = vm;
  }

  // 流式选项
  if (config.stream) {
    body.stream_options = {
      exclude_aggregated_audio: config.streamOptions.excludeAggregatedAudio,
    };
  }

  // 字幕类型
  if (config.subtitleEnable) {
    body.subtitle_type = config.subtitleType;
  }

  return body;
}
