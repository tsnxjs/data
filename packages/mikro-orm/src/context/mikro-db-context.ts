import {
  DbContext,
  type IDbTransaction,
  type IDbSet,
  type EntityConstructor,
  type IDatabaseFacade,
} from '@tsnx/data';
import type { EntityManager, MikroORM } from '@mikro-orm/core';
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

  async saveChanges(_cancellationToken?: AbortSignal): Promise<number> {
    if (this._isDisposed) {
      throw new Error('Cannot save changes on a disposed DbContext.');
    }
    const uow = this.em.getUnitOfWork();
    const count = uow.getPersistStack().size + uow.getRemoveStack().size;
    await this.em.flush();
    return count;
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
