/**
 * Logger utility for structured logging across the application
 * Only active in development mode for debugging purposes
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogMessage {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
  context?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR

  private formatMessage(level: LogLevel, message: string, data?: unknown, context?: string): LogMessage {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel
  }

  private output(logMessage: LogMessage): void {
    if (!this.shouldLog(logMessage.level)) return

    const prefix = logMessage.context ? `[${logMessage.context}]` : ''
    const formattedMessage = `${prefix} ${logMessage.message}`

    switch (logMessage.level) {
      case LogLevel.DEBUG:
        console.debug('🔍', formattedMessage, logMessage.data || '')
        break
      case LogLevel.INFO:
        console.info('ℹ️', formattedMessage, logMessage.data || '')
        break
      case LogLevel.WARN:
        console.warn('⚠️', formattedMessage, logMessage.data || '')
        break
      case LogLevel.ERROR:
        console.error('❌', formattedMessage, logMessage.data || '')
        break
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    this.output(this.formatMessage(LogLevel.DEBUG, message, data, context))
  }

  info(message: string, data?: unknown, context?: string): void {
    this.output(this.formatMessage(LogLevel.INFO, message, data, context))
  }

  warn(message: string, data?: unknown, context?: string): void {
    this.output(this.formatMessage(LogLevel.WARN, message, data, context))
  }

  error(message: string, data?: unknown, context?: string): void {
    this.output(this.formatMessage(LogLevel.ERROR, message, data, context))
  }
}

export const logger = new Logger()