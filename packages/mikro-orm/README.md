# @tsnx/mikro-orm

> MikroORM integration provider for TSNX Data, implementing EF Core-inspired DbContext, Scoped EntityManager forks, and Hosted Service database lifecycle management.

## Key Features

- **`MikroDbContext`**: Integrates MikroORM's `EntityManager` into TSNX's `DbContext` and `IUnitOfWork` contracts.
- **Scoped Identity Map**: Forked per HTTP request or background work scope (`MIKRO_ORM_EM`), preventing cross-request state pollution.
- **Hosted Database Lifetime**: Automatically tests connectivity on application boot, applies pending migrations / creates schema, and safely closes connection pools on shutdown.
- **Entity Repository Injection**: Register strongly-typed entity repositories or `DbSet<T>` directly into TSNX's DI container.

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
  dbName: ':memory:',
  entities: [User],
}), {
  autoMigrate: true,
  ensureCreated: true,
});

const app = builder.build();

// 2. Inject DbContext in route handlers (Scoped per request)
app.mapGet('/users', async (context: MikroDbContext) => {
  const users = context.set(User);
  return await users.findMany();
});

await app.run();
```
