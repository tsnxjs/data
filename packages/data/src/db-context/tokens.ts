import { createToken } from '@tsnx/hosting-abstractions';
import type { IDbContext, DbContextOptions } from './types.js';
import type { IUnitOfWork } from '../unit-of-work/types.js';

export const DB_CONTEXT = createToken<IDbContext>('DB_CONTEXT');
export const DB_CONTEXT_OPTIONS = createToken<DbContextOptions>('DB_CONTEXT_OPTIONS');
export const DB_UNIT_OF_WORK = createToken<IUnitOfWork>('DB_UNIT_OF_WORK');
