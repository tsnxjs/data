import type {
  IDbSet,
  EntityConstructor,
  FilterQuery,
  FindOptions,
} from '@tsnx/data';
import type { EntityManager } from '@mikro-orm/core';

export class MikroDbSet<TEntity extends object, TId = unknown>
  implements IDbSet<TEntity, TId>
{
  constructor(
    private readonly em: EntityManager,
    readonly entityType: EntityConstructor<TEntity>,
  ) {}

  async findById(id: TId, _signal?: AbortSignal): Promise<TEntity | null> {
    return (await this.em.findOne(this.entityType as any, id as any)) as TEntity | null;
  }

  async findOne(
    filter: FilterQuery<TEntity>,
    options?: FindOptions<TEntity>,
  ): Promise<TEntity | null> {
    return (await this.em.findOne(
      this.entityType as any,
      filter as any,
      this.mapOptions(options),
    )) as TEntity | null;
  }

  async findMany(
    filter?: FilterQuery<TEntity>,
    options?: FindOptions<TEntity>,
  ): Promise<TEntity[]> {
    return (await this.em.find(
      this.entityType as any,
      (filter ?? {}) as any,
      this.mapOptions(options),
    )) as TEntity[];
  }

  async count(filter?: FilterQuery<TEntity>, _signal?: AbortSignal): Promise<number> {
    return await this.em.count(this.entityType as any, (filter ?? {}) as any);
  }

  async exists(filter: FilterQuery<TEntity>, _signal?: AbortSignal): Promise<boolean> {
    const c = await this.count(filter);
    return c > 0;
  }

  add(entity: TEntity): void {
    this.em.persist(entity);
  }

  addMany(entities: TEntity[]): void {
    this.em.persist(entities);
  }

  remove(entity: TEntity): void {
    this.em.remove(entity);
  }

  removeMany(entities: TEntity[]): void {
    for (const entity of entities) {
      this.em.remove(entity);
    }
  }

  /**
   * Executes a bulk update directly in the database without loading entities into memory.
   */
  async executeUpdate(
    filter: FilterQuery<TEntity>,
    data: Partial<TEntity> | Record<string, any>,
  ): Promise<number> {
    return await this.em.nativeUpdate(
      this.entityType as any,
      (filter ?? {}) as any,
      data as any,
    );
  }

  /**
   * Executes a bulk delete directly in the database without loading entities into memory.
   */
  async executeDelete(filter: FilterQuery<TEntity>): Promise<number> {
    return await this.em.nativeDelete(
      this.entityType as any,
      (filter ?? {}) as any,
    );
  }

  private mapOptions(options?: FindOptions<TEntity>): any {
    if (!options) return undefined;
    const mapped: any = {};
    if (options.skip !== undefined) mapped.offset = options.skip;
    if (options.take !== undefined) mapped.limit = options.take;
    if (options.orderBy) mapped.orderBy = options.orderBy;
    if (options.populate) mapped.populate = options.populate;
    if (options.fields) mapped.fields = options.fields;
    if (options.asNoTracking) mapped.disableIdentityMap = true;
    if (options.cache !== undefined) mapped.cache = options.cache;
    return mapped;
  }
}
