import { envString, type RoleMap } from "../config";

export const EDGE_TTS_DEFAULT_ROLE_MAP: RoleMap = {
  // 内置通用角色
  narrator: { nameZh: "旁白", speaker: "zh-CN-XiaoxiaoNeural" },
  male_lead: { nameZh: "男主", speaker: "zh-CN-YunxiNeural" },
  female_lead: { nameZh: "女主", speaker: "zh-CN-XiaoyiNeural" },

  // 章节内常用角色（避免多名女性共用同一音色）
  lin_xiaoyuan: { nameZh: "林筱鸢", speaker: "zh-CN-XiaoyiNeural" },
  an_siyao: { nameZh: "安思瑶", speaker: "zh-CN-XiaoxuanNeural" },
  bai_tuzi: { nameZh: "白荼子", speaker: "zh-CN-XiaohanNeural" },
  xia_yiqiu: { nameZh: "夏依秋", speaker: "zh-CN-XiaomoNeural" },

  // 兼容 tts.js 中的 Azure 音色配置（追加）
  xiaoxiao: { nameZh: "晓晓·女", speaker: "zh-CN-XiaoxiaoNeural" },
  xiaoyi: { nameZh: "晓伊·女", speaker: "zh-CN-XiaoyiNeural" },
  xiaohan: { nameZh: "晓涵·女", speaker: "zh-CN-XiaohanNeural" },
  xiaomeng: { nameZh: "晓梦·女", speaker: "zh-CN-XiaomengNeural" },
  xiaomo: { nameZh: "晓墨·女", speaker: "zh-CN-XiaomoNeural" },
  xiaoqiu: { nameZh: "晓秋·女", speaker: "zh-CN-XiaoqiuNeural" },
  xiaoshuang: { nameZh: "晓双·女", speaker: "zh-CN-XiaoshuangNeural" },
  xiaoxuan: { nameZh: "晓萱·女", speaker: "zh-CN-XiaoxuanNeural" },
  xiaoyan: { nameZh: "晓颜·女", speaker: "zh-CN-XiaoyanNeural" },
  xiaoyou: { nameZh: "晓悠·女", speaker: "zh-CN-XiaoyouNeural" },
  xiaorui: { nameZh: "晓睿·女", speaker: "zh-CN-XiaoruiNeural" },
  xiaozhen: { nameZh: "晓甄·女", speaker: "zh-CN-XiaozhenNeural" },
  xiaochen: { nameZh: "晓辰·女", speaker: "zh-CN-XiaochenNeural" },

  yunxi: { nameZh: "云希·男", speaker: "zh-CN-YunxiNeural" },
  yunyang: { nameZh: "云扬·男", speaker: "zh-CN-YunyangNeural" },
  yunjian: { nameZh: "云健·男", speaker: "zh-CN-YunjianNeural" },
  yunfeng: { nameZh: "云枫·男", speaker: "zh-CN-YunfengNeural" },
  yunhao: { nameZh: "云皓·男", speaker: "zh-CN-YunhaoNeural" },
  yunjie: { nameZh: "云杰·男", speaker: "zh-CN-YunjieNeural" },
  yunxia: { nameZh: "云夏·男", speaker: "zh-CN-YunxiaNeural" },
  yunye: { nameZh: "云野·男", speaker: "zh-CN-YunyeNeural" },
  yunze: { nameZh: "云泽·男", speaker: "zh-CN-YunzeNeural" },
};

export type EdgeTtsConfig = {
  /** Edge TTS 服务根地址，如 https://tts.wangwangit.com */
  baseUrl: string;
  /** Azure voice id */
  voice: string;
  /** 说话风格 */
  style: string;
  /** 语速，通常 0.5~2.0 */
  speed: number;
  /** 音调，字符串数值，如 "0" / "25" / "-25" */
  pitch: string;
  /** 角色映射 */
  roleMap: RoleMap;
};

export function getEdgeTtsDefaults(): EdgeTtsConfig {
  return {
    baseUrl: envString("EDGE_TTS_BASE_URL", "https://tts.wangwangit.com"),
    voice: envString("EDGE_TTS_VOICE", "zh-CN-XiaoxiaoNeural"),
    style: envString("EDGE_TTS_STYLE", "general"),
    speed: Number(envString("EDGE_TTS_SPEED", "1.0")) || 1.0,
    pitch: envString("EDGE_TTS_PITCH", "0"),
    roleMap: EDGE_TTS_DEFAULT_ROLE_MAP,
  };
}