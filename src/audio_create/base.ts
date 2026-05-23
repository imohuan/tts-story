import type { BatchItem, RoleMap } from "../config";

/**
 * 音频生成器基类接口
 * 所有实现只需关注"输入一条任务，输出音频字节"
 */
export abstract class BaseAudioCreator {
  abstract synthOne(item: BatchItem): Promise<Uint8Array>;

  /** 返回当前 provider 的角色映射表，供外部解析角色使用 */
  abstract getRoleMap(): RoleMap;
}

/**
 * 音频生成器类型标识
 * 新增实现时在此扩展联合类型
 */
export type AudioProviderType =
  | "volcengine_ws"
  | "minimax_http"
  | "edge_tts";

/**
 * 用户可配置的 provider 设置
 * "auto" 表示根据条目特征自动判断
 */
export type ProviderSetting = AudioProviderType | "auto";

/**
 * 音频生成器工厂注册表
 */
const creatorRegistry = new Map<
  AudioProviderType,
  new (config: Record<string, unknown>) => BaseAudioCreator
>();

export function registerAudioProvider(
  type: AudioProviderType,
  ctor: new (config: Record<string, unknown>) => BaseAudioCreator,
): void {
  creatorRegistry.set(type, ctor);
}

export function createAudioCreator(
  type: AudioProviderType,
  config: Record<string, unknown>,
): BaseAudioCreator {
  const Ctor = creatorRegistry.get(type);
  if (!Ctor) {
    throw new Error(
      `未注册的音频生成器: "${type}"，已注册: [${[...creatorRegistry.keys()].join(", ")}]`,
    );
  }
  return new Ctor(config);
}
