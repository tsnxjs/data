import type { HostedService } from '@tsnx/hosting-abstractions';

/**
 * Service managing database connection lifecycle, health verification, and clean shutdown.
 */
export interface IDatabaseLifetimeService extends HostedService {
  /** True when database is fully connected and initialized. */
  readonly isReady: boolean;

  /** Forces initialization if called outside host startup. */
  initialize(signal?: AbortSignal): Promise<void>;

  /** Forces closure of database connections. */
  close(signal?: AbortSignal): Promise<void>;
}
