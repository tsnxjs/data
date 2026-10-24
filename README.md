# TSNX Data & ORM Ecosystem (`tsnxjs/data`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm: @tsnx/data](https://img.shields.io/npm/v/@tsnx/data)](https://www.npmjs.com/package/@tsnx/data)
[![npm: @tsnx/mikro-orm](https://img.shields.io/npm/v/@tsnx/mikro-orm)](https://www.npmjs.com/package/@tsnx/mikro-orm)

> EF Core-inspired database abstractions and ORM providers for the [TSNX](https://github.com/tsnxjs/tsnx) application framework.

## Packages

| Package | Version | Description |
|---|---|---|
| [`@tsnx/data`](packages/data) | `1.2.1` | Core abstractions: `DbContext`, `IUnitOfWork`, `IDbContextFactory`, `DbConcurrencyException`, and DI integration |
| [`@tsnx/mikro-orm`](packages/mikro-orm) | `1.2.1` | MikroORM provider adapter: Scoped `EntityManager` fork, `MikroDbContext`, `IDbContextFactory`, and optimistic concurrency mapping |

---

## Architectural Principles (Inspired by EF Core)

1. **Scoped Unit of Work (`DbContext`)**:
   - Each HTTP request or background worker scope receives an isolated `DbContext` instance.
   - For MikroORM, this is backed by `em.fork()`, ensuring identity map isolation and eliminating cross-request state pollution.

2. **`IDbContextFactory<TContext>`**:
   - Creates fresh, isolated `DbContext` instances on-demand outside standard HTTP request scopes (background jobs, queue consumers, CLI commands).

3. **Optimistic Concurrency & HTTP 409 Conflict**:
   - Version column conflicts (`OptimisticLockError`) are automatically mapped to `DbConcurrencyException` with `statusCode: 409`, integrating directly with TSNX ProblemDetails error handling.

4. **High-Performance `asNoTracking` Queries**:
   - Read-heavy queries bypass identity map tracking for reduced memory allocation and maximum throughput.

5. **Transaction Management (`IDbTransaction`)**:
   - Explicit transactions (`await context.beginTransaction()`, `await tx.commit()`, `await tx.rollback()`).
   - Managed execution (`await context.executeInTransaction(async (tx) => { ... })`) with automatic rollback on error.

6. **Transparent Host Lifecycle**:
   - Connection pools are opened on demand and closed cleanly upon application shutdown (`SIGTERM`/`SIGINT`) via internal hosted services, keeping the public API clean and idiomatic.

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
  enableSensitiveDataLogging: true,
});

const app = builder.build();

// Inject Scoped DbContext in endpoints
app.mapGet('/users', async (db: MikroDbContext) => {
  return await db.set(User).findMany({}, { asNoTracking: true });
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
