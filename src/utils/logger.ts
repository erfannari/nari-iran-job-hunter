export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const meta = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${meta}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'DEBUG') {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const errorDetails = error instanceof Error ? { errorName: error.name, errorMessage: error.message, stack: error.stack } : { rawError: error };
    console.error(this.formatMessage(LogLevel.ERROR, message, { ...errorDetails, ...context }));
  }
}

export const logger = new Logger();
