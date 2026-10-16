import type { DbContextOptions } from '@tsnx/data';
import type { HostedService } from '@tsnx/hosting-abstractions';
import { MikroORM, type Options } from '@mikro-orm/core';

export type MikroOrmSource =
  | MikroORM
  | Options
  | (() => Promise<MikroORM> | MikroORM);

/**
 * Internal hosted service managing MikroORM startup initialization and clean connection pool shutdown.
 */
export class MikroHostService implements HostedService {
  private _isReady = false;
  private _orm: MikroORM | null = null;

  constructor(
    private readonly source: MikroOrmSource,
    private readonly options?: DbContextOptions,
  ) {
    if (source instanceof MikroORM || (source && typeof (source as any).isConnected === 'function')) {
      this._orm = source as MikroORM;
    }
  }

  get isReady(): boolean {
    return this._isReady;
  }

  get instance(): MikroORM {
    if (!this._orm) {
      throw new Error(
        'MikroORM instance is not yet initialized. Start the application host or supply an initialized MikroORM instance.',
      );
    }
    return this._orm;
  }

  async start(signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      throw new Error('Host startup aborted before database initialization.');
    }

    try {
      // 1. Resolve or initialize MikroORM instance
      if (!this._orm) {
        if (typeof this.source === 'function') {
          this._orm = await this.source();
        } else {
          const config = { ...(this.source as Options) };
          if (this.options?.enableSensitiveDataLogging) {
            config.debug = true;
          } else if (this.options?.enableLogging !== undefined) {
            config.debug = Boolean(this.options.enableLogging);
          }
          this._orm = await MikroORM.init(config);
        }
      }

      // 2. Verify / ensure connection
      const isConnected = await this._orm.isConnected();
      if (!isConnected) {
        await this._orm.connect();
      }

      // 3. Auto-migration or schema creation if configured
      if (this.options?.autoMigrate && this._orm.migrator) {
        await this._orm.migrator.up();
      } else if (this.options?.ensureCreated && this._orm.schema) {
        await this._orm.schema.ensureDatabase();
        await this._orm.schema.updateSchema({ safe: true });
      }

      this._isReady = true;
    } catch (error) {
      // Rollback and cleanup partial resources within catch to prevent dangling pools
      try {
        if (this._orm && (await this._orm.isConnected())) {
          await this._orm.close(true);
        }
      } catch {
        // Suppress secondary cleanup error and rethrow the primary failure
      }
      this._isReady = false;
      throw error;
    }
  }

  async stop(_signal: AbortSignal): Promise<void> {
    try {
      if (this._orm && (await this._orm.isConnected())) {
        await this._orm.close(true);
      }
    } finally {
      this._isReady = false;
    }
  }
}
