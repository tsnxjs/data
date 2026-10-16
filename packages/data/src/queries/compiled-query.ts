import type { DbContext } from '../db-context/db-context.js';

export interface CompiledQueryOptions {
  /**
   * Unique cache key prefix for caching query results.
   */
  cacheKey?: string;

  /**
   * Time to live in milliseconds for in-memory cached results.
   */
  ttlMs?: number;
}

export type CompiledQuery<TContext extends DbContext, TResult, TArgs extends unknown[]> = (
  context: TContext,
  ...args: TArgs
) => Promise<TResult>;

/**
 * Creates a reusable, pre-planned query function with optional result caching,
 * inspired by EF Core's Compiled Queries.
 */
export function createCompiledQuery<
  TContext extends DbContext,
  TResult,
  TArgs extends unknown[] = [],
>(
  queryFn: (context: TContext, ...args: TArgs) => Promise<TResult>,
  options?: CompiledQueryOptions,
): CompiledQuery<TContext, TResult, TArgs> {
  const cache = new Map<string, { value: TResult; expiresAt: number }>();

  return async (context: TContext, ...args: TArgs): Promise<TResult> => {
    if (!options?.ttlMs) {
      return await queryFn(context, ...args);
    }

    const key = options.cacheKey
      ? `${options.cacheKey}:${JSON.stringify(args)}`
      : JSON.stringify(args);

    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const result = await queryFn(context, ...args);
    cache.set(key, { value: result, expiresAt: now + options.ttlMs });
    return result;
  };
}
