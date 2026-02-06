import { createPspTransaction } from "../psp/pspSimulator.js";
import { Transaction } from "../domain/Transaction.js";
import { TransactionStatus } from "../domain/TransactionStatus.js";

// In-memory storage for now (replace with DB later)
export const transactions = new Map<string, Transaction>(); // <-- EXPORT HERE

export interface CreateTransactionPayload {
  amount: number;
  currency: string;
  cardNumber: string;
  cardExpiry: string;
  cvv: string;
  orderId: string;
  callbackUrl: string;
  failureUrl: string;
}

export async function createTransaction(payload: CreateTransactionPayload) {
  // Generate internal transaction ID
  const internalId = `internal_${Math.random().toString(36).substring(2, 10)}`;

  // Create internal transaction object
  const transaction = new Transaction(internalId, TransactionStatus.CREATED, payload.amount);

  // Store in memory
  transactions.set(internalId, transaction);

  // Call PSP simulator
  const pspResponse = await createPspTransaction(payload);

  // Map PSP status to internal transaction status
  if (pspResponse.status === "SUCCESS") {
    transaction.transitionTo(TransactionStatus.SUCCESS);
  } else if (pspResponse.status === "FAILED") {
    transaction.transitionTo(TransactionStatus.FAILED);
  } else if (pspResponse.status === "PENDING_3DS") {
    transaction.transitionTo(TransactionStatus.PENDING_3DS);
  }

  // Save PSP transaction ID to internal transaction for webhook mapping
  transaction.pspTransactionId = pspResponse.transactionId;

  // Return both internal & PSP info
  return {
    internalTransactionId: internalId,
    status: transaction.status,
    psp: pspResponse,
  };
}

// Helper to fetch transaction by internal ID
export function getTransaction(internalId: string) {
  return transactions.get(internalId);
}
