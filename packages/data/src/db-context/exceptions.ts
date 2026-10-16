/**
 * Thrown when an optimistic concurrency conflict occurs (e.g. version column mismatch),
 * preventing lost updates. Mapped to HTTP 409 Conflict.
 */
export class DbConcurrencyException extends Error {
  readonly statusCode = 409;
  readonly entityName?: string;
  readonly entityId?: unknown;

  constructor(
    message = 'A database concurrency conflict occurred. The entity has been modified or deleted by another operation.',
    options?: { entityName?: string; entityId?: unknown; cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = 'DbConcurrencyException';
    this.entityName = options?.entityName;
    this.entityId = options?.entityId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
