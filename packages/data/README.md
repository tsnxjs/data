# @tsnx/data

> EF Core-inspired database abstractions, Unit of Work, DbContext, and Dependency Injection lifecycle integration for TSNX.

## Key Features

- **`DbContext`**: Unit of work pattern coordinating entity changes, transactions, and repositories across requests.
- **Scoped Lifetime**: Ensures entity change tracking and transactions are strictly isolated per HTTP request / scope.
- **Repository & `DbSet<T>`**: Strongly-typed entity operations (`findById`, `findOne`, `findMany`, `count`, `add`, `remove`).
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
    .enableAutoMigrate();
});

// 2. Consume in route handlers / services with Scoped lifetime
app.mapGet('/users', async (db: AppDbContext) => {
  return await db.set(User).findMany();
});
```
