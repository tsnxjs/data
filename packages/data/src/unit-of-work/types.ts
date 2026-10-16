/**
 * Represents an active database transaction.
 */
export interface IDbTransaction {
  /** Unique transaction identifier. */
  readonly transactionId: string;

  /** Whether the transaction has been committed or rolled back. */
  readonly isCompleted: boolean;

  /** Commits the transaction to the database. */
  commit(): Promise<void>;

  /** Rolls back the transaction, discarding uncommitted operations. */
  rollback(): Promise<void>;
}

/**
 * Unit of Work contract coordinating writes across entities and transactions.
 */
export interface IUnitOfWork {
  /**
   * Persists all pending entity changes tracked in this unit of work.
   * @param cancellationToken Optional abort signal.
   * @returns Number of state entries written to the database.
   */
  saveChanges(cancellationToken?: AbortSignal): Promise<number>;

  /**
   * Begins a new transaction or joins an existing one.
   * @param isolationLevel Optional transaction isolation level.
   */
  beginTransaction(isolationLevel?: string): Promise<IDbTransaction>;

  /**
   * Returns the current active transaction in this unit of work, if any.
   */
  readonly currentTransaction: IDbTransaction | null;

  /**
   * Executes a callback within a managed transaction.
   * Automatically commits on success and rolls back on error.
   */
  executeInTransaction<T>(
    operation: (transaction: IDbTransaction) => Promise<T>,
    isolationLevel?: string,
  ): Promise<T>;

  /**
   * True if this unit of work has been disposed.
   */
  readonly isDisposed: boolean;

  /**
   * Disposes this unit of work and cleans up associated scoped resources.
   */
  dispose(): Promise<void> | void;
}
