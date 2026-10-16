import type { IDbTransaction } from '@tsnx/data';
import type { EntityManager } from '@mikro-orm/core';

export class MikroDbTransaction implements IDbTransaction {
  readonly transactionId: string;
  private _isCompleted = false;

  constructor(
    private readonly em: EntityManager,
    transactionId?: string,
  ) {
    this.transactionId =
      transactionId ?? `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  get isCompleted(): boolean {
    return this._isCompleted;
  }

  async commit(): Promise<void> {
    if (this._isCompleted) return;
    await this.em.commit();
    this._isCompleted = true;
  }

  async rollback(): Promise<void> {
    if (this._isCompleted) return;
    await this.em.rollback();
    this._isCompleted = true;
  }
}
