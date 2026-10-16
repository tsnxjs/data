import { createToken, type ServiceToken } from '@tsnx/hosting-abstractions';
import type { IDbContext, DbContextOptions } from './types.js';
import type { IUnitOfWork } from '../unit-of-work/types.js';
import type { IDbContextFactory } from './factory.js';

export const DB_CONTEXT: ServiceToken<IDbContext> = createToken<IDbContext>('DB_CONTEXT');
export const DB_CONTEXT_OPTIONS: ServiceToken<DbContextOptions> = createToken<DbContextOptions>('DB_CONTEXT_OPTIONS');
export const DB_UNIT_OF_WORK: ServiceToken<IUnitOfWork> = createToken<IUnitOfWork>('DB_UNIT_OF_WORK');
export const DB_CONTEXT_FACTORY: ServiceToken<IDbContextFactory<any>> = createToken<IDbContextFactory<any>>('DB_CONTEXT_FACTORY');
