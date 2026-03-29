import { TransactionStatus } from "./TransactionStatus.js";
import { assertValidTransition } from "./TransactionStateMachine.js";

export class Transaction {
  public pspTransactionId?: string;
  public finalAmount?: number;

  private constructor(
    public readonly id: string,
    public status: TransactionStatus,
    public readonly amount: number,
    public readonly currency: string,
    public readonly orderId: string,
  ) {}

  static create(id: string, amount: number, currency: string, orderId: string): Transaction {
    if (amount <= 0) {
      throw new Error("Transaction amount must be greater than zero");
    }
    return new Transaction(id, TransactionStatus.CREATED, amount, currency, orderId);
  }

  static restore(
    id: string,
    status: TransactionStatus,
    amount: number,
    currency: string,
    orderId: string,
    pspTransactionId?: string,
    finalAmount?: number,
  ): Transaction {
    const transaction = new Transaction(id, status, amount, currency, orderId);

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
      return;
    }

    assertValidTransition(this.status, newStatus);
    this.status = newStatus;
  }

  
  updateAmount(newAmount: number): void {
    if (newAmount <= 0) {
      throw new Error("Transaction amount must be greater than zero");
    }
    if (this.status === TransactionStatus.SUCCESS && this.finalAmount !== undefined) {
      throw new Error("Cannot change amount after success");
    }

    this.finalAmount = newAmount;
  }

  attachPspTransactionId(pspTransactionId: string): void {
    if (this.pspTransactionId) {
      return;
    }
    this.pspTransactionId = pspTransactionId;
  }
}