import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntitySchema, MikroORM } from '@mikro-orm/core';
import { defineConfig } from '@mikro-orm/sqlite';
import { ServiceCollection } from '@tsnx/hosting';
import { HOSTED_SERVICE_TOKEN } from '@tsnx/hosting-abstractions';
import {
  DB_CONTEXT,
  DB_UNIT_OF_WORK,
  DB_CONTEXT_FACTORY,
  DbConcurrencyException,
  type IDbContextFactory,
} from '@tsnx/data';
import {
  addMikroOrm,
  MikroDbContext,
  MIKRO_ORM,
  MIKRO_ORM_EM,
  MikroHostService,
} from '../index.js';

class Book {
  id!: number;
  title!: string;

  constructor(title: string) {
    this.title = title;
  }
}

const BookSchema = new EntitySchema({
  class: Book,
  properties: {
    id: { type: 'number', primary: true },
    title: { type: 'string' },
  },
});

class InventoryItem {
  id!: number;
  sku!: string;
  stock!: number;
  version!: number;

  constructor(sku: string, stock: number) {
    this.sku = sku;
    this.stock = stock;
  }
}

const InventoryItemSchema = new EntitySchema({
  class: InventoryItem,
  properties: {
    id: { type: 'number', primary: true },
    sku: { type: 'string' },
    stock: { type: 'number' },
    version: { type: 'number', version: true },
  },
});

describe('@tsnx/mikro-orm - EF Core Inspired Integration', () => {
  it('manages lifecycle, scoped identity maps, and transactions', async () => {
    const config = defineConfig({
      dbName: ':memory:',
      entities: [BookSchema, InventoryItemSchema],
    });

    const orm = await MikroORM.init(config);

    const services = new ServiceCollection();
    addMikroOrm(services, orm, {
      ensureCreated: true,
      enableSensitiveDataLogging: true,
    });

    const rootProvider = services.buildServiceProvider({ validateScopes: true });

    // 1. Verify HostedService initialization
    const hostedDescriptors = services.findAll(HOSTED_SERVICE_TOKEN);
    assert.ok(hostedDescriptors.length > 0);
    const hs = hostedDescriptors[0].factory!(rootProvider);
    await hs.start(new AbortController().signal);

    const hostService = rootProvider.get(MikroHostService);
    assert.equal(hostService.isReady, true);
    assert.equal(hostService.instance, orm);
    assert.equal(rootProvider.get(MIKRO_ORM), orm);

    try {
      // 2. Scope 1: Insert Book using DbContext Unit of Work
      const scope1 = rootProvider.createScope();
      const ctx1 = scope1.get(MikroDbContext);
      const em1 = scope1.get(MIKRO_ORM_EM);

      assert.equal(ctx1.em, em1, 'DbContext must use the scoped EntityManager fork');
      assert.equal(scope1.get(DB_CONTEXT), ctx1);
      assert.equal(scope1.get(DB_UNIT_OF_WORK), ctx1);

      const books1 = ctx1.set(Book);
      const newBook = new Book('Enterprise Architecture with TSNX');
      books1.add(newBook);
      const affected = await ctx1.saveChanges();
      assert.equal(affected, 1);
      assert.ok(newBook.id > 0);

      // 3. Scope 2: Query Book with asNoTracking option
      const scope2 = rootProvider.createScope();
      const ctx2 = scope2.get(MikroDbContext);
      const em2 = scope2.get(MIKRO_ORM_EM);

      assert.notEqual(em1, em2, 'Each scope must have its own isolated EntityManager fork');
      assert.notEqual(ctx1, ctx2, 'Each scope must have its own DbContext instance');

      const books2 = ctx2.set(Book);
      const readOnlyBooks = await books2.findMany(
        { id: newBook.id },
        { asNoTracking: true },
      );
      assert.equal(readOnlyBooks.length, 1);
      assert.equal(readOnlyBooks[0].title, 'Enterprise Architecture with TSNX');

      // 4. Test Transaction rollback on error
      let errorThrown = false;
      try {
        await ctx1.executeInTransaction(async () => {
          const rollbackBook = new Book('Should Rollback');
          books1.add(rollbackBook);
          await ctx1.saveChanges();
          throw new Error('Simulated transaction failure');
        });
      } catch {
        errorThrown = true;
      }
      assert.equal(errorThrown, true);

      // Verify rolled back entity is not in database
      const booksAfterRollback = await books2.findMany({ title: 'Should Rollback' });
      assert.equal(booksAfterRollback.length, 0);

      // 5. Test IDbContextFactory (outside HTTP scope)
      const factory = rootProvider.get<IDbContextFactory<MikroDbContext>>(DB_CONTEXT_FACTORY);
      assert.ok(factory, 'IDbContextFactory must be registered as singleton');

      const workerDb = factory.createDbContext();
      const workerBooks = await workerDb.set(Book).findMany();
      assert.ok(workerBooks.length >= 1);
      workerDb.dispose();

      // Clean up scopes
      await scope1.dispose();
      await scope2.dispose();
    } finally {
      // 6. Test HostedService graceful shutdown
      await hs.stop(new AbortController().signal);
      assert.equal(hostService.isReady, false);
    }
  });

  it('maps optimistic concurrency conflicts to DbConcurrencyException (HTTP 409 Conflict)', async () => {
    const config = defineConfig({
      dbName: ':memory:',
      entities: [InventoryItemSchema],
    });

    const orm = await MikroORM.init(config);
    const services = new ServiceCollection();
    addMikroOrm(services, orm, { ensureCreated: true });
    const rootProvider = services.buildServiceProvider();

    const hs = services.findAll(HOSTED_SERVICE_TOKEN)[0].factory!(rootProvider);
    await hs.start(new AbortController().signal);

    try {
      const factory = rootProvider.get<IDbContextFactory<MikroDbContext>>(DB_CONTEXT_FACTORY);

      // Seed an inventory item
      const seedContext = factory.createDbContext();
      const item = new InventoryItem('LAPTOP-X1', 10);
      seedContext.set(InventoryItem).add(item);
      await seedContext.saveChanges();
      const itemId = item.id;
      seedContext.dispose();

      // Request A reads item
      const contextA = factory.createDbContext();
      const itemA = await contextA.set(InventoryItem).findById(itemId);
      assert.ok(itemA);

      // Request B reads item
      const contextB = factory.createDbContext();
      const itemB = await contextB.set(InventoryItem).findById(itemId);
      assert.ok(itemB);

      // Request A updates stock to 8 and saves (version increments)
      itemA.stock = 8;
      await contextA.saveChanges();
      contextA.dispose();

      // Request B attempts to update stock to 7 based on stale version
      itemB.stock = 7;
      let concurrencyError: DbConcurrencyException | null = null;
      try {
        await contextB.saveChanges();
      } catch (err: any) {
        if (err instanceof DbConcurrencyException) {
          concurrencyError = err;
        }
      }

      assert.ok(concurrencyError, 'Must throw DbConcurrencyException on version conflict');
      assert.equal(concurrencyError.statusCode, 409, 'Must map to HTTP 409 Conflict');
      assert.equal(concurrencyError.name, 'DbConcurrencyException');

      contextB.dispose();
    } finally {
      await hs.stop(new AbortController().signal);
    }
  });
});
