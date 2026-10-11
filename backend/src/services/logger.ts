import { randomUUID } from 'crypto';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type PlatformModule =
  | 'AIR_QUALITY'
  | 'PERSONAL_COPILOT'
  | 'SCHOOL_SAFETY'
  | 'PARALI_MARKETPLACE'
  | 'NOTIFICATIONS'
  | 'SCHEDULER'
  | 'OBSERVABILITY'
  | 'AUTH'
  | 'SYSTEM';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  service: string;
  module: PlatformModule;
  action: string;
  message: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Sensitive key patterns for automatic sanitization
const SENSITIVE_KEY_REGEX = /(password|token|secret|authorization|authHeader|apiKey|jwt|credential)/i;
const HEALTH_KEY_REGEX = /(hasAsthma|hasCardiovascularCondition|pregnancy|healthConditions|medicalNotes)/i;
const PHONE_KEY_REGEX = /(phone|mobile|contactPhone)/i;

/**
 * Recursively sanitizes an object to remove sensitive secrets, credentials,
 * unmasked health conditions, and phone numbers before logging to CloudWatch.
 */
export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED_SECRET]';
    } else if (HEALTH_KEY_REGEX.test(key)) {
      sanitized[key] = '[HEALTH_DATA_MASKED]';
    } else if (PHONE_KEY_REGEX.test(key) && typeof value === 'string') {
      sanitized[key] = value.length > 4 ? `******${value.slice(-4)}` : '[MASKED_PHONE]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

class StructuredLogger {
  private serviceName: string = 'AirQualityIntelligence';
  private circularBufferSize: number = 100;
  private logBuffer: StructuredLogEntry[] = [];

  /**
   * Extract or create correlation ID from request headers or AWS context
   */
  public getOrCreateCorrelationId(headers?: Record<string, string | undefined>): string {
    if (!headers) return `corr-${randomUUID().substring(0, 8)}`;
    return (
      headers['x-correlation-id'] ||
      headers['X-Correlation-Id'] ||
      headers['x-amzn-trace-id'] ||
      headers['X-Amzn-Trace-Id'] ||
      `corr-${randomUUID().substring(0, 8)}`
    );
  }

  private emit(
    level: LogLevel,
    module: PlatformModule,
    action: string,
    message: string,
    correlationId: string = 'unassigned',
    metadata?: Record<string, any>,
    error?: Error | any
  ) {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlationId,
      service: this.serviceName,
      module,
      action,
      message,
      metadata: metadata ? sanitizeLogData(metadata) : undefined,
      error: error
        ? {
            name: error.name || 'Error',
            message: error.message || String(error),
            stack: process.env.NODE_ENV === 'test' ? undefined : error.stack,
          }
        : undefined,
    };

    // Store in circular buffer for real-time observability diagnostics
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.circularBufferSize) {
      this.logBuffer.shift();
    }

    // Format as single-line structured JSON for Amazon CloudWatch Logs
    const logLine = JSON.stringify(entry);

    if (level === 'ERROR') {
      console.error(logLine);
    } else if (level === 'WARN') {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }
  }

  public info(
    module: PlatformModule,
    action: string,
    message: string,
    correlationId?: string,
    metadata?: Record<string, any>
  ): void {
    this.emit('INFO', module, action, message, correlationId, metadata);
  }

  public warn(
    module: PlatformModule,
    action: string,
    message: string,
    correlationId?: string,
    metadata?: Record<string, any>
  ): void {
    this.emit('WARN', module, action, message, correlationId, metadata);
  }

  public error(
    module: PlatformModule,
    action: string,
    message: string,
    correlationId?: string,
    metadata?: Record<string, any>,
    error?: Error | any
  ): void {
    this.emit('ERROR', module, action, message, correlationId, metadata, error);
  }

  public debug(
    module: PlatformModule,
    action: string,
    message: string,
    correlationId?: string,
    metadata?: Record<string, any>
  ): void {
    this.emit('DEBUG', module, action, message, correlationId, metadata);
  }

  public getRecentLogs(limit: number = 20): StructuredLogEntry[] {
    return this.logBuffer.slice(-limit);
  }

  public clearBuffer(): void {
    this.logBuffer = [];
  }
}

export const logger = new StructuredLogger();
