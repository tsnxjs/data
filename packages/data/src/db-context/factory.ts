import type { DbContext } from './db-context.js';

/**
 * Factory contract for creating DbContext instances on-demand outside of standard HTTP scopes
 * (e.g. background workers, message consumers, scheduled jobs, scripts).
 */
export interface IDbContextFactory<TContext extends DbContext = DbContext> {
  /**
   * Creates a new, isolated DbContext instance.
   * Callers are responsible for disposing the returned context when finished.
   */
  createDbContext(): TContext;
}
