import type { IDbContextFactory } from '@tsnx/data';
import type { Constructor } from '@tsnx/hosting-abstractions';
import type { MikroORM } from '@mikro-orm/core';
import type { MikroDbContext } from './mikro-db-context.js';

/**
 * Creates isolated MikroDbContext instances outside standard HTTP request scopes
 * (e.g. background workers, queue consumers, CLI commands).
 */
export class MikroDbContextFactory<TContext extends MikroDbContext = MikroDbContext>
  implements IDbContextFactory<TContext>
{
  constructor(
    private readonly orm: MikroORM,
    private readonly contextClass: Constructor<TContext>,
  ) {}

  createDbContext(): TContext {
    const em = this.orm.em.fork();
    return new this.contextClass(em, this.orm);
  }
}
