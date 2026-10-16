export type EntityConstructor<T extends object = object> = new (...args: any[]) => T;

export type FilterQuery<T> = {
  [K in keyof T]?: T[K] | T[K][] | { $eq?: T[K]; $ne?: T[K]; $in?: T[K][]; $gt?: any; $gte?: any; $lt?: any; $lte?: any; $like?: string };
} | Record<string, any>;

export interface FindOptions<T> {
  skip?: number;
  take?: number;
  orderBy?: { [K in keyof T]?: 'asc' | 'desc' } | Record<string, 'asc' | 'desc'>;
  populate?: string[];
  fields?: (keyof T)[];
  cancellationToken?: AbortSignal;
}

/**
 * Read-only repository interface.
 */
export interface IReadRepository<TEntity extends object, TId = unknown> {
  /**
   * Finds an entity by its primary key identifier.
   */
  findById(id: TId, cancellationToken?: AbortSignal): Promise<TEntity | null>;

  /**
   * Finds the first entity matching the specified filter criteria.
   */
  findOne(filter: FilterQuery<TEntity>, options?: FindOptions<TEntity>): Promise<TEntity | null>;

  /**
   * Finds all entities matching the specified query criteria.
   */
  findMany(filter?: FilterQuery<TEntity>, options?: FindOptions<TEntity>): Promise<TEntity[]>;

  /**
   * Counts the total number of entities matching the filter criteria.
   */
  count(filter?: FilterQuery<TEntity>, cancellationToken?: AbortSignal): Promise<number>;

  /**
   * Returns true if at least one entity satisfies the filter criteria.
   */
  exists(filter: FilterQuery<TEntity>, cancellationToken?: AbortSignal): Promise<boolean>;
}

/**
 * Full repository interface supporting CRUD operations within the Unit of Work.
 */
export interface IRepository<TEntity extends object, TId = unknown> extends IReadRepository<TEntity, TId> {
  /**
   * Attaches or stages an entity for insertion in the current Unit of Work.
   */
  add(entity: TEntity): void | Promise<void>;

  /**
   * Attaches or stages multiple entities for insertion in the current Unit of Work.
   */
  addMany(entities: TEntity[]): void | Promise<void>;

  /**
   * Stages an entity for removal in the current Unit of Work.
   */
  remove(entity: TEntity): void | Promise<void>;

  /**
   * Stages multiple entities for removal in the current Unit of Work.
   */
  removeMany(entities: TEntity[]): void | Promise<void>;
}

/**
 * DbSet contract modeled after EF Core's DbSet<TEntity>, bridging queries and repository operations.
 */
export interface IDbSet<TEntity extends object, TId = unknown> extends IRepository<TEntity, TId> {
  /** The constructor of the entity type. */
  readonly entityType: EntityConstructor<TEntity>;
}
