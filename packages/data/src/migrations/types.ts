/**
 * Database migration runner abstraction.
 */
export interface IMigrationRunner {
  /** Applies all pending migrations to the target database. */
  up(signal?: AbortSignal): Promise<void>;

  /** Rolls back the latest applied migration. */
  down(signal?: AbortSignal): Promise<void>;

  /** Returns names or identifiers of pending migrations. */
  getPendingMigrations(signal?: AbortSignal): Promise<string[]>;

  /** Creates a new migration file with the specified name. */
  createMigration?(name: string): Promise<string>;
}
