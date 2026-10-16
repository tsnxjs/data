import {
  DbContext,
  DbConcurrencyException,
  type IDbTransaction,
  type IDbSet,
  type EntityConstructor,
  type IDatabaseFacade,
} from '@tsnx/data';
import {
  OptimisticLockError,
  type EntityManager,
  type MikroORM,
} from '@mikro-orm/core';
import { MikroDatabaseFacade } from './mikro-database-facade.js';
import { MikroDbTransaction } from './mikro-transaction.js';
import { MikroDbSet } from '../repository/mikro-repository.js';

/**
 * MikroORM-backed DbContext conforming to EF Core Unit of Work architecture.
 */
export class MikroDbContext extends DbContext {
  readonly database: IDatabaseFacade;
  private _currentTransaction: IDbTransaction | null = null;
  private _isDisposed = false;

  constructor(
    readonly em: EntityManager,
    readonly orm: MikroORM,
  ) {
    super();
    this.database = new MikroDatabaseFacade(orm);
  }

  get currentTransaction(): IDbTransaction | null {
    return this._currentTransaction;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Persists all pending entity changes to the database.
   * Automatically intercepts MikroORM's OptimisticLockError and rethrows as
   * DbConcurrencyException (HTTP 409 Conflict).
   */
  async saveChanges(_cancellationToken?: AbortSignal): Promise<number> {
    if (this._isDisposed) {
      throw new Error('Cannot save changes on a disposed DbContext.');
    }
    const uow = this.em.getUnitOfWork();
    const count = uow.getPersistStack().size + uow.getRemoveStack().size;

    try {
      await this.em.flush();
    } catch (error: any) {
      if (
        error instanceof OptimisticLockError ||
        error?.name === 'OptimisticLockError' ||
        error?.constructor?.name === 'OptimisticLockError'
      ) {
        throw new DbConcurrencyException(
          error.message ?? 'A database concurrency conflict occurred. The entity was modified by another operation.',
          {
            entityName: error?.entity?.constructor?.name,
            entityId: (error?.entity as any)?.id,
            cause: error,
          },
        );
      }
      throw error;
    }

    return count;
  }

  /**
   * Sets filter parameter values on this DbContext session (e.g. tenantId).
   */
  enableFilter(name: string, args?: Record<string, any>): this {
    this.em.setFilterParams(name, args ?? {});
    return this;
  }

  /**
   * Registers a global filter onto this DbContext session.
   */
  addFilter(
    name: string,
    cond: Record<string, any> | ((args: Record<string, any>) => any),
    enabled = true,
  ): this {
    this.em.addFilter(name, cond as any, undefined, enabled);
    return this;
  }

  async beginTransaction(isolationLevel?: string): Promise<IDbTransaction> {
    await this.em.begin({ isolationLevel: isolationLevel as any });
    const tx = new MikroDbTransaction(this.em);
    this._currentTransaction = tx;
    return tx;
  }

  async executeInTransaction<T>(
    operation: (transaction: IDbTransaction) => Promise<T>,
    isolationLevel?: string,
  ): Promise<T> {
    const tx = await this.beginTransaction(isolationLevel);
    try {
      const result = await operation(tx);
      await tx.commit();
      return result;
    } catch (err) {
      await tx.rollback();
      throw err;
    } finally {
      if (this._currentTransaction === tx) {
        this._currentTransaction = null;
      }
    }
  }

  set<TEntity extends object, TId = unknown>(
    entityType: EntityConstructor<TEntity>,
  ): IDbSet<TEntity, TId> {
    return new MikroDbSet<TEntity, TId>(this.em, entityType);
  }

  dispose(): void {
    if (this._isDisposed) return;
    this.em.clear();
    this._isDisposed = true;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.dispose();
  }
}
