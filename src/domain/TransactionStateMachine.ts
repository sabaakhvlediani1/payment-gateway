import { TransactionStatus } from "./TransactionStatus.js";

const allowedTransitions: Record<
  TransactionStatus,
  TransactionStatus[]
> = {
  [TransactionStatus.CREATED]: [
    TransactionStatus.PENDING_3DS,
    TransactionStatus.SUCCESS,
    TransactionStatus.FAILED,
  ],

  [TransactionStatus.PENDING_3DS]: [
    TransactionStatus.SUCCESS,
    TransactionStatus.FAILED,
  ],

  [TransactionStatus.SUCCESS]: [],
  [TransactionStatus.FAILED]: [],
};


export function canTransition(
  from: TransactionStatus,
  to: TransactionStatus
): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertValidTransition(
  from: TransactionStatus,
  to: TransactionStatus
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid transaction state transition: ${from} → ${to}`
    );
  }
}

