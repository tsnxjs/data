/**
 * Contextual metadata passed to database command interceptors.
 */
export interface DbCommandContext {
  command: string;
  params?: unknown[];
  startTime?: number;
  durationMs?: number;
  error?: unknown;
  metadata?: Record<string, any>;
}

/**
 * Interceptor contract inspired by EF Core's DbCommandInterceptor.
 * Allows observing, diagnosing, and logging executed SQL commands and query timing.
 */
export interface IDbCommandInterceptor {
  beforeExecute?(context: DbCommandContext): void | Promise<void>;
  afterExecute?(context: DbCommandContext): void | Promise<void>;
  onError?(context: DbCommandContext): void | Promise<void>;
}
