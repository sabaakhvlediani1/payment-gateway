import { TransactionStatus } from "./TransactionStatus.js";
import { assertValidTransition } from "./TransactionStateMachine.js";

export class Transaction {
  pspTransactionId?: string; 

  constructor(
    public readonly id: string,
    public status: TransactionStatus,
    public amount: number
  ) {}

  transitionTo(newStatus: TransactionStatus) {
    assertValidTransition(this.status, newStatus);
    this.status = newStatus;
  }
}

