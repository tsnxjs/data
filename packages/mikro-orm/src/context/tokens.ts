import { createToken, type ServiceToken } from '@tsnx/hosting-abstractions';
import type { MikroORM, EntityManager, Options } from '@mikro-orm/core';

export const MIKRO_ORM: ServiceToken<MikroORM> = createToken<MikroORM>('MIKRO_ORM');
export const MIKRO_ORM_EM: ServiceToken<EntityManager> = createToken<EntityManager>('MIKRO_ORM_EM');
export const MIKRO_ORM_OPTIONS: ServiceToken<Options> = createToken<Options>('MIKRO_ORM_OPTIONS');
