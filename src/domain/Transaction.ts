import { TransactionStatus } from "./TransactionStatus.js";
import { assertValidTransition } from "./TransactionStateMachine.js";

export class Transaction {
  public pspTransactionId?: string;
  public finalAmount?: number; // Added to track confirmed amount

  private constructor(
    public readonly id: string,
    public status: TransactionStatus,
    public readonly amount: number, // Made readonly to preserve the original request record
  ) {}

  static create(id: string, amount: number): Transaction {
    if (amount <= 0) {
      throw new Error("Transaction amount must be greater than zero");
    }
    return new Transaction(id, TransactionStatus.CREATED, amount);
  }

  static restore(
    id: string,
    status: TransactionStatus,
    amount: number,
    pspTransactionId?: string,
    finalAmount?: number, // Added to restore from DB
  ): Transaction {
    const transaction = new Transaction(id, status, amount);

    if (pspTransactionId) {
      transaction.pspTransactionId = pspTransactionId;
    }
    if (finalAmount !== undefined) {
      transaction.finalAmount = finalAmount;
    }

    return transaction;
  }

  transitionTo(newStatus: TransactionStatus): void {
    if (this.status === newStatus) {
      return; // idempotent
    }

    assertValidTransition(this.status, newStatus);
    this.status = newStatus;
  }

  // Changed this to update finalAmount specifically
  updateAmount(newAmount: number): void {
    if (newAmount <= 0) {
      throw new Error("Transaction amount must be greater than zero");
    }
    // Logic: Once it's success, we shouldn't be changing the final amount record
    if (this.status === TransactionStatus.SUCCESS && this.finalAmount !== undefined) {
      throw new Error("Cannot change amount after success");
    }

    this.finalAmount = newAmount;
  }

  attachPspTransactionId(pspTransactionId: string): void {
    if (this.pspTransactionId) {
      return; // idempotent
    }
    this.pspTransactionId = pspTransactionId;
  }
}