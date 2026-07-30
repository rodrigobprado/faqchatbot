export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Readonly<Record<string, string | number | boolean | undefined>>;

export type PlatformLogger = {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
};

const redactValue = (value: string | number | boolean | undefined) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.length > 8 ? "[redacted]" : value;
};

export const createLogger = (service: string): PlatformLogger => {
  const write = (level: LogLevel, message: string, context: LogContext = {}) => {
    const redactedContext = Object.fromEntries(
      Object.entries(context).map(([key, value]) => [
        key,
        /token|secret|password|apikey|api_key/i.test(key) ? redactValue(value) : value
      ]),
    );

    const payload = {
      level,
      service,
      message,
      context: redactedContext,
      timestamp: new Date().toISOString()
    };

    const line = JSON.stringify(payload);
    if (level === "error") {
      console.error(line);
      return;
    }

    if (level === "warn") {
      console.warn(line);
      return;
    }

    process.stdout.write(`${line}\n`);
  };

  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context)
  };
};
