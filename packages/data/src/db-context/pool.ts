import type { DbContext } from './db-context.js';

export interface DbContextPoolOptions {
  maxPoolSize?: number;
}

/**
 * Recycles and reuses DbContext instances to minimize garbage collection allocations,
 * inspired by EF Core's DbContext Pooling.
 */
export class DbContextPool<TContext extends DbContext> {
  private readonly pool: TContext[] = [];
  readonly maxPoolSize: number;

  constructor(
    private readonly factory: () => TContext,
    options?: DbContextPoolOptions,
  ) {
    this.maxPoolSize = options?.maxPoolSize ?? 32;
  }

  /**
   * Retrieves an available DbContext from the pool, or instantiates a new one if pool is empty.
   */
  get(): TContext {
    const context = this.pool.pop();
    if (context) {
      return context;
    }
    return this.factory();
  }

  /**
   * Returns a DbContext back to the pool after resetting its internal state.
   */
  return(context: TContext): void {
    if (this.pool.length < this.maxPoolSize) {
      if (typeof (context as any).resetState === 'function') {
        (context as any).resetState();
      } else {
        context.dispose();
        if ('isDisposed' in context) {
          (context as any).isDisposed = false;
        }
      }
      this.pool.push(context);
    }
  }

  /**
   * Returns the number of currently pooled idle DbContext instances.
   */
  get size(): number {
    return this.pool.length;
  }
}
