import type { IUnitOfWork } from '../unit-of-work/types.js';
import type { EntityConstructor, IDbSet, IRepository } from '../repository/types.js';

/**
 * Provides database-level management, migrations, and connectivity checks
 * inspired by EF Core's DatabaseFacade (context.Database).
 */
export interface IDatabaseFacade {
  /** The name of the underlying database provider (e.g. 'mikro-orm', 'sqlite', 'postgres'). */
  readonly providerName: string;

  /** Checks if the database can be connected to. */
  canConnect(cancellationToken?: AbortSignal): Promise<boolean>;

  /** Ensures the database schema is created. Returns true if created, false if already exists. */
  ensureCreated(cancellationToken?: AbortSignal): Promise<boolean>;

  /** Executes pending migrations against the database. */
  migrate(cancellationToken?: AbortSignal): Promise<void>;
}

/**
 * Root DbContext contract representing a session with the database.
 */
export interface IDbContext extends IUnitOfWork {
  /**
   * Database facade for schema, connectivity, and migrations.
   */
  readonly database: IDatabaseFacade;

  /**
   * Retrieves a DbSet for the specified entity type.
   */
  set<TEntity extends object, TId = unknown>(entityType: EntityConstructor<TEntity>): IDbSet<TEntity, TId>;

  /**
   * Alias for set(entityType) - retrieves repository for entity type.
   */
  getRepository<TEntity extends object, TId = unknown>(entityType: EntityConstructor<TEntity>): IRepository<TEntity, TId>;
}

/**
 * Configuration options for DbContext.
 */
export interface DbContextOptions<TOptions = unknown> {
  providerName?: string;
  connectionString?: string;
  autoMigrate?: boolean;
  ensureCreated?: boolean;
  enableLogging?: boolean;
  enableSensitiveDataLogging?: boolean;
  providerOptions?: TOptions;
}

/**
 * Fluent builder for configuring DbContextOptions.
 */
export class DbContextOptionsBuilder<TOptions = unknown> {
  private _options: DbContextOptions<TOptions> = {};

  useConnectionString(connectionString: string): this {
    this._options.connectionString = connectionString;
    return this;
  }

  enableAutoMigrate(autoMigrate = true): this {
    this._options.autoMigrate = autoMigrate;
    return this;
  }

  ensureCreated(ensureCreated = true): this {
    this._options.ensureCreated = ensureCreated;
    return this;
  }

  enableLogging(enable = true): this {
    this._options.enableLogging = enable;
    return this;
  }

  enableSensitiveDataLogging(enable = true): this {
    this._options.enableSensitiveDataLogging = enable;
    return this;
  }

  useProviderOptions(providerOptions: TOptions, providerName?: string): this {
    this._options.providerOptions = providerOptions;
    if (providerName) {
      this._options.providerName = providerName;
    }
    return this;
  }

  build(): DbContextOptions<TOptions> {
    return { ...this._options };
  }
}
