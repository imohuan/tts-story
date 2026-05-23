import { createAudioCreator, type AudioProviderType } from "../audio_create/base";
import type { RoleMap } from "../config";

// 导入实现以触发 registerAudioProvider(...) 自注册
import "../audio_create/volcengine-ws";
import "../audio_create/minimax-http";
import "../audio_create/edge-tts";

type ExportPayload = {
  generatedAt: string;
  providers: Partial<Record<AudioProviderType, RoleMap>>;
};

const PROVIDERS: AudioProviderType[] = [
  "volcengine_ws",
  "minimax_http",
  "edge_tts",
];

function parsePrettyArg(argv: string[]): number {
  const idx = argv.findIndex((v) => v === "--pretty");
  if (idx === -1) return 2;
  const next = argv[idx + 1];
  const n = next ? Number.parseInt(next, 10) : NaN;
  return Number.isFinite(n) ? Math.max(0, n) : 2;
}

function parseProviderArg(argv: string[]): AudioProviderType | undefined {
  const providerFlags = ["--provider", "--type"];
  const idx = argv.findIndex((v) => providerFlags.includes(v));
  if (idx === -1) return undefined;

  const raw = argv[idx + 1];
  if (!raw) {
    throw new Error(
      `缺少 provider 参数值，可选: ${PROVIDERS.join(" | ")}`,
    );
  }

  if (!PROVIDERS.includes(raw as AudioProviderType)) {
    throw new Error(`无效 provider: "${raw}"，可选: ${PROVIDERS.join(" | ")}`);
  }

  return raw as AudioProviderType;
}

function collectRoleMaps(provider?: AudioProviderType): ExportPayload {
  const targetProviders = provider ? [provider] : PROVIDERS;

  const providers = Object.fromEntries(
    targetProviders.map((type) => {
      const creator = createAudioCreator(type, {});
      return [type, creator.getRoleMap()];
    }),
  ) as ExportPayload["providers"];

  return {
    generatedAt: new Date().toISOString(),
    providers,
  };
}

function main(): void {
  const argv = process.argv.slice(2);
  const pretty = parsePrettyArg(argv);
  const provider = parseProviderArg(argv);
  const payload = collectRoleMaps(provider);
  console.log(JSON.stringify(payload, null, pretty));
}

main();