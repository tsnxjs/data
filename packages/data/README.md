# @tsnx/data

> EF Core-inspired database abstractions, Unit of Work, DbContext, and Dependency Injection lifecycle integration for TSNX.

## Key Features

- **`DbContext`**: Unit of work pattern coordinating changes, transactions, and repositories across requests.
- **Scoped Lifetime**: Ensures entity change tracking and transactions are isolated per HTTP request / scope.
- **Repository & `DbSet<T>`**: Strongly-typed entity operations (`find`, `findOne`, `findMany`, `add`, `remove`).
- **Hosted Database Lifetime**: Automatically handles startup connectivity verification, auto-migrations, and graceful shutdown during application lifetime.
- **Provider Agnostic**: Core contracts are decoupled from specific ORMs, with `@tsnx/mikro-orm` as the first-class provider integration.

## Installation

```bash
pnpm add @tsnx/data
```

## Quick Start

```typescript
import { DbContext, addDbContext } from '@tsnx/data';

// 1. Register DbContext in your TSNX WebApplication / ServiceCollection
builder.services.addDbContext(AppDbContext, (options) => {
  options
    .useConnectionString('postgresql://localhost:5432/mydb')
    .enableAutoMigrate();
});
```
