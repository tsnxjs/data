import type { IDbContext, IDatabaseFacade } from './types.js';
import type { IDbTransaction } from '../unit-of-work/types.js';
import type { EntityConstructor, IDbSet, IRepository } from '../repository/types.js';

/**
 * Base DbContext class inspired by EF Core's DbContext.
 * Providers (like MikroDbContext) extend this class to implement store-specific behavior.
 */
export abstract class DbContext implements IDbContext {
  abstract readonly database: IDatabaseFacade;
  abstract readonly currentTransaction: IDbTransaction | null;
  abstract readonly isDisposed: boolean;

  abstract saveChanges(cancellationToken?: AbortSignal): Promise<number>;
  abstract beginTransaction(isolationLevel?: string): Promise<IDbTransaction>;
  abstract executeInTransaction<T>(
    operation: (transaction: IDbTransaction) => Promise<T>,
    isolationLevel?: string,
  ): Promise<T>;

  abstract set<TEntity extends object, TId = unknown>(
    entityType: EntityConstructor<TEntity>,
  ): IDbSet<TEntity, TId>;

  getRepository<TEntity extends object, TId = unknown>(
    entityType: EntityConstructor<TEntity>,
  ): IRepository<TEntity, TId> {
    return this.set(entityType);
  }

  abstract dispose(): Promise<void> | void;
}
