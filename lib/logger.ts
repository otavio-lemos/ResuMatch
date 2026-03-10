type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: any) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      message,
      ...(context && { context }),
    };
  }

  info(message: string, context?: any) {
    const log = this.formatMessage('info', message, context);
    if (this.isProduction) {
      console.info(JSON.stringify(log));
    } else {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  warn(message: string, context?: any) {
    const log = this.formatMessage('warn', message, context);
    if (this.isProduction) {
      console.warn(JSON.stringify(log));
    } else {
      console.warn(`[WARN] ${message}`, context || '');
    }
  }

  error(message: string, error?: any, context?: any) {
    const log = this.formatMessage('error', message, {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: this.isProduction ? undefined : error.stack,
      } : error
    });
    
    if (this.isProduction) {
      console.error(JSON.stringify(log));
    } else {
      console.error(`[ERROR] ${message}`, error, context || '');
    }
  }

  debug(message: string, context?: any) {
    if (this.isProduction) return;
    const log = this.formatMessage('debug', message, context);
    console.debug(`[DEBUG] ${message}`, context || '');
  }
}

export const logger = new Logger();
