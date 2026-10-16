import type { IDatabaseFacade } from '@tsnx/data';
import type { MikroORM } from '@mikro-orm/core';

export class MikroDatabaseFacade implements IDatabaseFacade {
  readonly providerName = 'mikro-orm';

  constructor(private readonly orm: MikroORM) {}

  async canConnect(_signal?: AbortSignal): Promise<boolean> {
    try {
      return await this.orm.isConnected();
    } catch {
      return false;
    }
  }

  async ensureCreated(_signal?: AbortSignal): Promise<boolean> {
    const generator = this.orm.schema;
    if (!generator) return false;
    try {
      await generator.ensureDatabase();
      await generator.updateSchema({ safe: true });
      return true;
    } catch {
      return false;
    }
  }

  async migrate(_signal?: AbortSignal): Promise<void> {
    const migrator = this.orm.migrator;
    if (migrator) {
      await migrator.up();
    }
  }
}
