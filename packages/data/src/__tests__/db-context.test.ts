import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ServiceCollection } from '@tsnx/hosting';
import {
  DbContext,
  DbContextOptionsBuilder,
  addDbContext,
  DB_CONTEXT,
  DB_UNIT_OF_WORK,
  DB_CONTEXT_OPTIONS,
  DbConcurrencyException,
  DbContextPool,
  createCompiledQuery,
  type IDatabaseFacade,
  type IDbTransaction,
  type IDbSet,
  type EntityConstructor,
  type IDbCommandInterceptor,
  type DbCommandContext,
} from '../index.js';

class MockUser {
  id!: number;
  name!: string;
}

class FakeDatabaseFacade implements IDatabaseFacade {
  readonly providerName = 'mock';
  async canConnect(): Promise<boolean> {
    return true;
  }
  async ensureCreated(): Promise<boolean> {
    return true;
  }
  async migrate(): Promise<void> {}
}

class TestDbContext extends DbContext {
  readonly database = new FakeDatabaseFacade();
  currentTransaction: IDbTransaction | null = null;
  isDisposed = false;
  savedChangesCount = 0;

  async saveChanges(): Promise<number> {
    this.savedChangesCount++;
    return 1;
  }

  async beginTransaction(): Promise<IDbTransaction> {
    const tx: IDbTransaction = {
      transactionId: 'tx-1',
      isCompleted: false,
      commit: async () => {},
      rollback: async () => {},
    };
    this.currentTransaction = tx;
    return tx;
  }

  async executeInTransaction<T>(operation: (tx: IDbTransaction) => Promise<T>): Promise<T> {
    const tx = await this.beginTransaction();
    try {
      const res = await operation(tx);
      await tx.commit();
      return res;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  set<TEntity extends object, TId = unknown>(
    entityType: EntityConstructor<TEntity>,
  ): IDbSet<TEntity, TId> {
    const items: TEntity[] = [];
    return {
      entityType,
      async findById(id: TId) {
        return (items.find((item: any) => item.id === id) as TEntity) ?? null;
      },
      async findOne(_filter: any) {
        return items[0] ?? null;
      },
      async findMany() {
        return [...items];
      },
      async count() {
        return items.length;
      },
      async exists() {
        return items.length > 0;
      },
      add(entity: TEntity) {
        items.push(entity);
      },
      addMany(entities: TEntity[]) {
        items.push(...entities);
      },
      remove(entity: TEntity) {
        const idx = items.indexOf(entity);
        if (idx !== -1) items.splice(idx, 1);
      },
      removeMany(entities: TEntity[]) {
        for (const e of entities) this.remove(e);
      },
      async executeUpdate(_filter: any, _data: any) {
        return 1;
      },
      async executeDelete(_filter: any) {
        return 1;
      },
    };
  }

  dispose(): void {
    this.isDisposed = true;
  }
}

describe('@tsnx/data - EF Core Inspired Abstractions & Scoped Lifecycle', () => {
  it('DbContextOptionsBuilder configures options including sensitive data logging and interceptors', () => {
    const executedContexts: DbCommandContext[] = [];
    const interceptor: IDbCommandInterceptor = {
      beforeExecute(ctx) {
        executedContexts.push(ctx);
      },
    };

    const builder = new DbContextOptionsBuilder();
    builder
      .useConnectionString('sqlite://test.db')
      .enableAutoMigrate(true)
      .ensureCreated(true)
      .enableLogging(true)
      .enableSensitiveDataLogging(true)
      .addInterceptor(interceptor);

    const options = builder.build();
    assert.equal(options.connectionString, 'sqlite://test.db');
    assert.equal(options.autoMigrate, true);
    assert.equal(options.ensureCreated, true);
    assert.equal(options.enableLogging, true);
    assert.equal(options.enableSensitiveDataLogging, true);
    assert.equal(options.interceptors?.length, 1);
  });

  it('DbConcurrencyException maps to HTTP 409 Conflict', () => {
    const err = new DbConcurrencyException('Row version changed by concurrent update.', {
      entityName: 'Product',
      entityId: 42,
    });

    assert.equal(err.statusCode, 409);
    assert.equal(err.name, 'DbConcurrencyException');
    assert.equal(err.entityName, 'Product');
    assert.equal(err.entityId, 42);
    assert.ok(err instanceof Error);
  });

  it('addDbContext registers DbContext with Scoped lifetime and binds tokens', async () => {
    const services = new ServiceCollection();

    addDbContext(services, TestDbContext, (opt) => {
      opt.useConnectionString('sqlite://in-memory.db').enableAutoMigrate();
    });

    const rootProvider = services.buildServiceProvider({ validateScopes: true });

    // In root, resolving scoped context should throw when validateScopes is true
    assert.throws(() => {
      rootProvider.get(TestDbContext);
    });

    // Create Scope 1
    const scope1 = rootProvider.createScope();
    const ctx1 = scope1.get(TestDbContext);
    const dbCtx1 = scope1.get(DB_CONTEXT);
    const uow1 = scope1.get(DB_UNIT_OF_WORK);
    const options = scope1.get(DB_CONTEXT_OPTIONS);

    assert.equal(ctx1, dbCtx1, 'DB_CONTEXT token must resolve to same scoped instance');
    assert.equal(ctx1, uow1, 'DB_UNIT_OF_WORK token must resolve to same scoped instance');
    assert.equal(options.connectionString, 'sqlite://in-memory.db');

    // Create Scope 2
    const scope2 = rootProvider.createScope();
    const ctx2 = scope2.get(TestDbContext);

    assert.notEqual(ctx1, ctx2, 'Different scopes must get isolated DbContext instances');

    // Test repository & unit of work operations
    const users = ctx1.set(MockUser);
    users.add({ id: 1, name: 'Alice' });
    await ctx1.saveChanges();
    assert.equal(ctx1.savedChangesCount, 1);

    // Test executeUpdate and executeDelete
    const updated = await users.executeUpdate({ id: 1 }, { name: 'Bob' });
    assert.equal(updated, 1);
    const deleted = await users.executeDelete({ id: 1 });
    assert.equal(deleted, 1);

    await scope1.dispose();
    await scope2.dispose();
  });

  it('DbContextPool recycles instances and resets state', () => {
    let createdCount = 0;
    const pool = new DbContextPool<TestDbContext>(() => {
      createdCount++;
      return new TestDbContext();
    }, { maxPoolSize: 2 });

    const ctx1 = pool.get();
    assert.equal(createdCount, 1);
    assert.equal(pool.size, 0);

    pool.return(ctx1);
    assert.equal(ctx1.isDisposed, false, 'Pooled context must be reset and not disposed');
    assert.equal(pool.size, 1);

    const recycled = pool.get();
    assert.equal(recycled, ctx1);
    assert.equal(createdCount, 1);
  });

  it('createCompiledQuery caches execution results within ttl window', async () => {
    let executeCalls = 0;
    const query = createCompiledQuery(
      async (_ctx: TestDbContext, category: string) => {
        executeCalls++;
        return [`item-for-${category}`];
      },
      { ttlMs: 1000, cacheKey: 'items' },
    );

    const ctx = new TestDbContext();
    const res1 = await query(ctx, 'books');
    const res2 = await query(ctx, 'books');

    assert.deepEqual(res1, ['item-for-books']);
    assert.deepEqual(res2, ['item-for-books']);
    assert.equal(executeCalls, 1, 'Query must be cached and not re-executed within TTL');
  });
});
