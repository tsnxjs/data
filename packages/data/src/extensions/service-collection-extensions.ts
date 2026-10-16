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
  DATABASE_LIFETIME_SERVICE,
} from '../db-context/tokens.js';
import {
  DbContextOptionsBuilder,
  type DbContextOptions,
} from '../db-context/types.js';
import type { IRepository } from '../repository/types.js';

export interface AddDbContextOptions<TOptions = unknown> {
  configure?: (builder: DbContextOptionsBuilder<TOptions>) => void;
  registerLifetimeHostedService?: boolean;
}

/**
 * Registers an EF Core-inspired DbContext in TSNX IServiceCollection.
 * The DbContext is registered with Scoped lifetime.
 */
export function addDbContext<TContext extends DbContext, TOptions = unknown>(
  services: IServiceCollection,
  ContextClass: Constructor<TContext>,
  optionsOrConfigure?:
    | ((builder: DbContextOptionsBuilder<TOptions>) => void)
    | AddDbContextOptions<TOptions>,
): IServiceCollection {
  const builder = new DbContextOptionsBuilder<TOptions>();

  let registerLifetime = true;

  if (typeof optionsOrConfigure === 'function') {
    optionsOrConfigure(builder);
  } else if (optionsOrConfigure) {
    if (optionsOrConfigure.configure) {
      optionsOrConfigure.configure(builder);
    }
    if (optionsOrConfigure.registerLifetimeHostedService !== undefined) {
      registerLifetime = optionsOrConfigure.registerLifetimeHostedService;
    }
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

  // 5. HostedService: DatabaseLifetimeService (if provider registered it)
  if (registerLifetime) {
    services.addHostedService().toFactory((sp) => {
      const lifetime = sp.getOptional(DATABASE_LIFETIME_SERVICE);
      if (!lifetime) {
        // Return dummy hosted service if no adapter registered a lifetime service
        return {
          start: async () => {},
          stop: async () => {},
        };
      }
      return lifetime;
    });
  }

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
