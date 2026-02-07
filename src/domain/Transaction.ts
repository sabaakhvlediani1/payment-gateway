import { TransactionStatus } from "./TransactionStatus.js";
import { assertValidTransition } from "./TransactionStateMachine.js";

export class Transaction {
  public pspTransactionId?: string;

  private constructor(
    public readonly id: string,
    public status: TransactionStatus,
    public amount: number,
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
  ): Transaction {
    const transaction = new Transaction(id, status, amount);

    if (pspTransactionId) {
      transaction.pspTransactionId = pspTransactionId;
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

  updateAmount(newAmount: number): void {
    if (newAmount <= 0) {
      throw new Error("Transaction amount must be greater than zero");
    }
    if (this.status === TransactionStatus.SUCCESS) {
      throw new Error("Cannot change amount after success");
    }

    this.amount = newAmount;
  }

  attachPspTransactionId(pspTransactionId: string): void {
    if (this.pspTransactionId) {
      return; // idempotent
    }

    this.pspTransactionId = pspTransactionId;
  }
}
