import type {
  IServiceCollection,
  Constructor,
  InjectionToken,
} from '@tsnx/hosting-abstractions';
import { DbContext } from '../db-context/db-context.js';
import {
  DB_CONTEXT,
  DB_CONTEXT_OPTIONS,
  DB_UNIT_OF_WORK,
} from '../db-context/tokens.js';
import {
  DbContextOptionsBuilder,
  type DbContextOptions,
} from '../db-context/types.js';
import type { IRepository } from '../repository/types.js';

/**
 * Registers an EF Core-inspired DbContext in TSNX IServiceCollection.
 * The DbContext and its tokens (DB_CONTEXT, DB_UNIT_OF_WORK) are registered with Scoped lifetime.
 */
export function addDbContext<TContext extends DbContext, TOptions = unknown>(
  services: IServiceCollection,
  ContextClass: Constructor<TContext>,
  configureOptions?: (builder: DbContextOptionsBuilder<TOptions>) => void,
): IServiceCollection {
  const builder = new DbContextOptionsBuilder<TOptions>();
  if (configureOptions) {
    configureOptions(builder);
  }

  const options = builder.build();

  // 1. Singleton: DbContextOptions
  services.addSingleton<DbContextOptions>(DB_CONTEXT_OPTIONS, options);

  // 2. Scoped: The DbContext class itself
  services.addScoped(ContextClass).toClass();

  // 3. Scoped: IDbContext token alias
  services.addScoped(DB_CONTEXT, (sp) => sp.get(ContextClass));

  // 4. Scoped: IUnitOfWork token alias
  services.addScoped(DB_UNIT_OF_WORK, (sp) => sp.get(ContextClass));

  return services;
}

/**
 * Registers a custom repository implementation with Scoped lifetime.
 */
export function addRepository<TEntity extends object, TRepo extends IRepository<TEntity>>(
  services: IServiceCollection,
  repoToken: InjectionToken<TRepo>,
  repoClass: Constructor<TRepo>,
): IServiceCollection {
  services.addScoped(repoToken).toClass(repoClass);
  return services;
}
