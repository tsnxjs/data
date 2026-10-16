# @tsnx/mikro-orm

> MikroORM integration provider for TSNX Data, implementing EF Core-inspired DbContext, Scoped EntityManager forks, IDbContextFactory, and Optimistic Concurrency mapping.

## Key Features

- **`MikroDbContext`**: Integrates MikroORM's `EntityManager` into TSNX's `DbContext` and `IUnitOfWork` contracts.
- **Scoped Identity Map**: Forked per HTTP request or background work scope (`MIKRO_ORM_EM`), preventing cross-request state pollution.
- **`IDbContextFactory`**: Creates isolated `MikroDbContext` instances outside HTTP scopes for background workers and schedulers.
- **Optimistic Concurrency**: Maps MikroORM's `OptimisticLockError` to `DbConcurrencyException` (HTTP 409 Conflict).
- **`asNoTracking` Queries**: Maps `asNoTracking: true` directly to MikroORM's `disableIdentityMap` for high-performance read-only operations.
- **Global Filters**: Ergonomic `enableFilter` and `addFilter` methods for multi-tenant and soft-delete workflows.

## Installation

```bash
pnpm add @tsnx/data @tsnx/mikro-orm @mikro-orm/core @mikro-orm/sqlite
```

## Quick Start

```typescript
import { WebApplication } from '@tsnx/web';
import { addMikroOrm, MikroDbContext } from '@tsnx/mikro-orm';
import { defineConfig } from '@mikro-orm/sqlite';
import { User } from './entities/User.js';

const builder = WebApplication.createBuilder();

// 1. Configure MikroORM and DbContext
addMikroOrm(builder.services, defineConfig({
  dbName: 'app.db',
  entities: [User],
}), {
  autoMigrate: true,
  ensureCreated: true,
  enableSensitiveDataLogging: true,
});

const app = builder.build();

// 2. Inject DbContext in route handlers (Scoped per request)
app.mapGet('/users', async (db: MikroDbContext) => {
  return await db.set(User).findMany({}, { asNoTracking: true });
});

await app.run();
```
