export type RetryOptions = {
  count?: number;
  delayMs?: number;
  backoffFactor?: number;
  jitterMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

export type ConcurrencyOptions<T, R> = {
  concurrency: number;
  items: T[];
  taskDelayMs?: number;
  taskTimeoutMs?: number;
  retry?: RetryOptions;
  stopOnError?: boolean;
  run: (item: T, index: number) => Promise<R>;
  onTaskStart?: (index: number, attempt: number) => void;
  onTaskRetry?: (index: number, attempt: number, error: unknown) => void;
  onTaskSuccess?: (index: number, attempt: number, result: R) => void;
  onTaskError?: (index: number, attempt: number, error: unknown) => void;
};

export type ConcurrencyResult<R> = {
  results: Array<R | undefined>;
  errors: Array<unknown | undefined>;
  failedCount: number;
  successCount: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`task timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function jitterDelay(baseMs: number, jitterMs = 0): number {
  if (jitterMs <= 0) return baseMs;
  const delta = Math.floor(Math.random() * (jitterMs + 1));
  return baseMs + delta;
}

async function runWithRetry<T>(
  runner: (attempt: number) => Promise<T>,
  options: RetryOptions | undefined,
  onRetry?: (attempt: number, error: unknown) => void,
): Promise<T> {
  const maxRetry = Math.max(0, options?.count ?? 0);
  const delayMs = Math.max(0, options?.delayMs ?? 0);
  const backoffFactor = Math.max(1, options?.backoffFactor ?? 2);
  const jitterMs = Math.max(0, options?.jitterMs ?? 0);
  const shouldRetry = options?.shouldRetry ?? (() => true);

  let attempt = 1;
  let lastError: unknown;

  while (attempt <= maxRetry + 1) {
    try {
      return await runner(attempt);
    } catch (error) {
      lastError = error;
      if (attempt > maxRetry || !shouldRetry(error, attempt)) {
        break;
      }

      onRetry?.(attempt, error);
      const waitMs = jitterDelay(
        delayMs * Math.pow(backoffFactor, attempt - 1),
        jitterMs,
      );
      if (waitMs > 0) await sleep(waitMs);
    }

    attempt += 1;
  }

  throw lastError;
}

export async function runConcurrent<T, R>(
  options: ConcurrencyOptions<T, R>,
): Promise<ConcurrencyResult<R>> {
  const { items, run, concurrency } = options;
  const results: Array<R | undefined> = new Array(items.length).fill(undefined);
  const errors: Array<unknown | undefined> = new Array(items.length).fill(
    undefined,
  );

  const workerCount = Math.max(1, Math.min(concurrency, items.length || 1));
  let nextIndex = 0;
  let failedCount = 0;
  let successCount = 0;
  let shouldStop = false;

  async function worker(): Promise<void> {
    while (!shouldStop) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;

      if (options.taskDelayMs && options.taskDelayMs > 0) {
        await sleep(options.taskDelayMs);
      }

      const item = items[current]!;

      try {
        const result = await runWithRetry(
          (attempt) => {
            options.onTaskStart?.(current, attempt);
            return withTimeout(run(item, current), options.taskTimeoutMs ?? 0);
          },
          options.retry,
          (attempt, error) => {
            options.onTaskRetry?.(current, attempt, error);
          },
        );
        results[current] = result;
        successCount += 1;
        options.onTaskSuccess?.(current, 1, result);
      } catch (error) {
        errors[current] = error;
        failedCount += 1;
        options.onTaskError?.(current, 1, error);
        if (options.stopOnError) {
          shouldStop = true;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    results,
    errors,
    failedCount,
    successCount,
  };
}
