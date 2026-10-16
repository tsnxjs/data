# TSNX Data & ORM Ecosystem (`tsnxjs/data`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm: @tsnx/data](https://img.shields.io/npm/v/@tsnx/data)](https://www.npmjs.com/package/@tsnx/data)
[![npm: @tsnx/mikro-orm](https://img.shields.io/npm/v/@tsnx/mikro-orm)](https://www.npmjs.com/package/@tsnx/mikro-orm)

> EF Core-inspired database abstractions and ORM providers for the [TSNX](https://github.com/tsnxjs/tsnx) application framework.

## Packages

| Package | Version | Description |
|---|---|---|
| [`@tsnx/data`](packages/data) | `0.1.0` | Core abstractions: `DbContext`, `IUnitOfWork`, `IRepository`, `IDbSet`, `IDbTransaction`, and DI integration |
| [`@tsnx/mikro-orm`](packages/mikro-orm) | `0.1.0` | MikroORM provider adapter: Scoped `EntityManager` fork, `MikroDbContext`, and Hosted Service lifetime |

---

## Architectural Principles (Inspired by EF Core)

1. **Scoped Unit of Work (`DbContext`)**:
   - Each HTTP request or background worker scope receives an isolated `DbContext` instance.
   - For MikroORM, this is backed by `em.fork()`, ensuring identity map isolation and eliminating cross-request state pollution.

2. **Transaction Management (`IDbTransaction`)**:
   - Explicit transactions (`await context.beginTransaction()`, `await tx.commit()`, `await tx.rollback()`).
   - Managed execution (`await context.executeInTransaction(async (tx) => { ... })`) with automatic rollback on error.

3. **Repository & `DbSet<T>`**:
   - Access entities using `context.set(Entity)` or inject registered entity repositories directly via `addEntityRepository(services, Entity)`.

4. **Transparent Host Lifecycle**:
   - Connection pools are opened on demand / on host start and closed cleanly upon application shutdown (`SIGTERM`/`SIGINT`) via internal hosted services, keeping the public API clean and idiomatic.

---

## Getting Started

### 1. Installation

```bash
pnpm add @tsnx/data @tsnx/mikro-orm @mikro-orm/core @mikro-orm/sqlite
```

### 2. Configure in your TSNX Application

```typescript
import { WebApplication } from '@tsnx/web';
import { addMikroOrm, MikroDbContext } from '@tsnx/mikro-orm';
import { defineConfig } from '@mikro-orm/sqlite';
import { User } from './entities/User.js';

const builder = WebApplication.createBuilder();

// Register MikroORM + DbContext
addMikroOrm(builder.services, defineConfig({
  dbName: 'app.db',
  entities: [User],
}), {
  autoMigrate: true,
  ensureCreated: true,
});

const app = builder.build();

// Inject Scoped DbContext in endpoints
app.mapGet('/users', async (db: MikroDbContext) => {
  return await db.set(User).findMany();
});

app.mapPost('/users', async (db: MikroDbContext, body: { name: string }) => {
  const users = db.set(User);
  const user = new User(body.name);
  users.add(user);
  await db.saveChanges();
  return user;
});

await app.run();
```

---

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run test suite
pnpm run test
```

## License

[MIT](LICENSE) © TSNX Authors
