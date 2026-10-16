# @tsnx/data

> EF Core-inspired database abstractions, Unit of Work, DbContext, and Dependency Injection lifecycle integration for TSNX.

## Key Features

- **`DbContext` & `IUnitOfWork`**: Coordinates entity changes, transactions, and repositories across requests.
- **`IDbContextFactory<T>`**: Creates isolated `DbContext` sessions outside standard HTTP scopes (background workers, queue consumers, CLI commands).
- **`DbConcurrencyException` (HTTP 409 Conflict)**: Built-in optimistic concurrency exception preserving entity identity and mapping directly to HTTP 409 ProblemDetails.
- **Scoped Lifetime**: Ensures entity change tracking and transactions are strictly isolated per HTTP request / scope.
- **`asNoTracking` Query Support**: Read-only queries bypass identity map tracking for improved throughput and memory efficiency.
- **Provider Agnostic**: Core contracts are decoupled from specific ORMs, with `@tsnx/mikro-orm` as the first-class provider integration.

## Installation

```bash
pnpm add @tsnx/data
```

## Quick Start (Inspired by EF Core)

```typescript
import { DbContext, addDbContext } from '@tsnx/data';

// 1. Register DbContext in TSNX IServiceCollection
addDbContext(builder.services, AppDbContext, (options) => {
  options
    .useConnectionString('postgresql://localhost:5432/mydb')
    .enableSensitiveDataLogging(process.env.NODE_ENV !== 'production')
    .enableAutoMigrate();
});

// 2. Consume in route handlers / services with Scoped lifetime
app.mapGet('/users', async (db: AppDbContext) => {
  return await db.set(User).findMany({}, { asNoTracking: true });
});
```
