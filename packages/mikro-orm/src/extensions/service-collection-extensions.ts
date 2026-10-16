import type {
  IServiceCollection,
  Constructor,
  InjectionToken,
} from '@tsnx/hosting-abstractions';
import {
  DB_CONTEXT,
  DB_UNIT_OF_WORK,
  DB_CONTEXT_OPTIONS,
  DATABASE_LIFETIME_SERVICE,
  type DbContextOptions,
  type EntityConstructor,
} from '@tsnx/data';
import type { MikroORM, EntityManager } from '@mikro-orm/core';
import { MikroDbContext } from '../context/mikro-db-context.js';
import { MIKRO_ORM, MIKRO_ORM_EM } from '../context/tokens.js';
import {
  MikroLifetimeService,
  type MikroOrmSource,
} from '../lifetime/mikro-lifetime-service.js';
import { MikroDbSet } from '../repository/mikro-repository.js';

export interface AddMikroOrmOptions<TContext extends MikroDbContext = MikroDbContext> {
  contextClass?: Constructor<TContext>;
  autoMigrate?: boolean;
  ensureCreated?: boolean;
  enableLogging?: boolean;
  connectionString?: string;
}

/**
 * Registers MikroORM integration into TSNX IServiceCollection.
 *
 * - MIKRO_ORM: Singleton, manages connection pools and metadata
 * - MIKRO_ORM_EM: Scoped, forked per scope/request for isolated Unit of Work
 * - MikroDbContext / ContextClass: Scoped, EF Core-like unit of work session
 * - Hosted Service: Automatically connects on host start and closes pools on host stop
 */
export function addMikroOrm<TContext extends MikroDbContext = MikroDbContext>(
  services: IServiceCollection,
  source: MikroOrmSource,
  optionsOrContext?: Constructor<TContext> | AddMikroOrmOptions<TContext>,
): IServiceCollection {
  let contextClass: Constructor<TContext> =
    MikroDbContext as unknown as Constructor<TContext>;
  let dbOptions: DbContextOptions = { providerName: 'mikro-orm' };

  if (typeof optionsOrContext === 'function') {
    contextClass = optionsOrContext;
  } else if (optionsOrContext) {
    if (optionsOrContext.contextClass) {
      contextClass = optionsOrContext.contextClass;
    }
    dbOptions = {
      providerName: 'mikro-orm',
      autoMigrate: optionsOrContext.autoMigrate,
      ensureCreated: optionsOrContext.ensureCreated,
      enableLogging: optionsOrContext.enableLogging,
      connectionString: optionsOrContext.connectionString,
    };
  }

  // 1. Register DbContextOptions
  services.addSingleton<DbContextOptions>(DB_CONTEXT_OPTIONS, dbOptions);

  // 2. Register Lifetime Service (Singleton)
  const lifetime = new MikroLifetimeService(source, dbOptions);
  services.addSingleton<MikroLifetimeService>(MikroLifetimeService, lifetime);
  services.addSingleton(DATABASE_LIFETIME_SERVICE, lifetime);

  // 3. Register Hosted Service for lifecycle start/stop
  services.addHostedService().toFactory((sp) => sp.get(MikroLifetimeService));

  // 4. Register MIKRO_ORM singleton
  services.addSingleton<MikroORM>(MIKRO_ORM, (sp) => sp.get(MikroLifetimeService).instance);

  // 5. Register MIKRO_ORM_EM as Scoped (forked per scope / request)
  services.addScoped<EntityManager>(MIKRO_ORM_EM, (sp) =>
    sp.get(MIKRO_ORM).em.fork(),
  );

  // 6. Register DbContext class as Scoped
  services.addScoped(contextClass, (sp) => {
    const em = sp.get(MIKRO_ORM_EM);
    const orm = sp.get(MIKRO_ORM);
    return new contextClass(em, orm);
  });

  // 7. Bind IDbContext and IUnitOfWork tokens to the scoped DbContext
  services.addScoped(DB_CONTEXT, (sp) => sp.get(contextClass));
  services.addScoped(DB_UNIT_OF_WORK, (sp) => sp.get(contextClass));

  return services;
}

/**
 * Registers an entity-specific repository or DbSet as Scoped in DI.
 */
export function addEntityRepository<TEntity extends object>(
  services: IServiceCollection,
  tokenOrEntity: InjectionToken<MikroDbSet<TEntity>> | EntityConstructor<TEntity>,
  entityType?: EntityConstructor<TEntity>,
): IServiceCollection {
  const entity = entityType ?? (tokenOrEntity as EntityConstructor<TEntity>);
  const token = tokenOrEntity as InjectionToken<MikroDbSet<TEntity>>;

  services.addScoped(token, (sp) => {
    const em = sp.get(MIKRO_ORM_EM);
    return new MikroDbSet<TEntity>(em, entity);
  });

  return services;
}
