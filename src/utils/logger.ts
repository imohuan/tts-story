import { appendFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

type LogLevel = "log" | "info" | "warn" | "error";

type LogMethod = (...args: unknown[]) => void;

/** 匹配栈帧中的 文件:行:列 */
const CALLSITE_RE = /\((.+):(\d+):(\d+)\)$/;

const LOGGER_FILE = "logger.ts";

function getCallsite(): string {
  const stack = new Error().stack?.split("\n") ?? [];

  for (const line of stack) {
    const match = line.trim().match(CALLSITE_RE);
    if (!match) continue;

    const [, filePath, lineNo, colNo] = match;
    if (!filePath) continue;

    const normalized = filePath.replace(/\\/g, "/");
    const fileName = normalized.split("/").pop() ?? normalized;

    // 跳过 logger.ts 自身，找到真正的调用方
    if (fileName === LOGGER_FILE) continue;

    return `${fileName}:${lineNo}:${colNo}`;
  }

  return "unknown:0:0";
}

const LEVEL_LABEL: Record<LogLevel, string> = {
  log: "LOG",
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
};

export type LoggerOptions = {
  /** 日志文件路径，默认 output/batch.log */
  filePath?: string;
  /** 是否同时输出到控制台，默认 true */
  console?: boolean;
};

let logFilePath: string = resolve("output/batch.log");
let enableConsole = true;
let dirEnsured = false;

export function configureLogger(opts: LoggerOptions = {}): void {
  if (opts.filePath) logFilePath = resolve(opts.filePath);
  if (opts.console !== undefined) enableConsole = opts.console;
  dirEnsured = false;
}

function writeToFile(line: string): void {
  try {
    if (!dirEnsured) {
      mkdirSync(dirname(logFilePath), { recursive: true });
      dirEnsured = true;
    }
    appendFileSync(logFilePath, line + "\n", "utf8");
  } catch {
    // 写文件失败时不影响主流程
  }
}

function formatMessage(level: LogLevel, args: unknown[]): string {
  const callsite = getCallsite();
  const ts = new Date().toISOString();
  const body = args
    .map((a) => (typeof a === "string" ? a : String(a)))
    .join(" ");
  return `${ts} [${LEVEL_LABEL[level]}] [${callsite}] ${body}`;
}

function createMethod(level: LogLevel): LogMethod {
  return (...args: unknown[]) => {
    const formatted = formatMessage(level, args);

    if (enableConsole) {
      console[level](formatted);
    }

    writeToFile(formatted);
  };
}

export const logger = {
  log: createMethod("log"),
  info: createMethod("info"),
  warn: createMethod("warn"),
  error: createMethod("error"),
};

export type Logger = typeof logger;
