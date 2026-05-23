import { runBatch } from "./batch/run";

runBatch().catch((err: unknown) => {
  const asAny = err as {
    message?: string;
    error?: { message?: string };
    type?: string;
  };
  const message =
    (err instanceof Error && err.message) ||
    asAny?.message ||
    asAny?.error?.message ||
    asAny?.type ||
    String(err);
  console.error(`[error] ${message}`);
  process.exit(1);
});
