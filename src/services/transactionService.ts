import { createPspTransaction } from "../psp/pspSimulator.js";
import { Transaction } from "../domain/Transaction.js";
import { TransactionStatus } from "../domain/TransactionStatus.js";

import { randomUUID } from "crypto";
import { transactionRepository } from "../repositories/transactionRepository.js";

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

function mapPspStatusToInternal(
  pspStatus: string
): TransactionStatus {
  switch (pspStatus) {
    case "SUCCESS":
      return TransactionStatus.SUCCESS;
    case "FAILED":
      return TransactionStatus.FAILED;
    case "PENDING_3DS":
      return TransactionStatus.PENDING_3DS;
    default:
      throw new Error(`Unknown PSP status: ${pspStatus}`);
  }
}

export async function createTransaction(
  payload: CreateTransactionPayload
) {
  const internalId = randomUUID();

  // Create domain entity
  const transaction = Transaction.create(internalId, payload.amount);

  // Call PSP
  const pspResponse = await createPspTransaction(payload);

  transaction.attachPspTransactionId(pspResponse.transactionId);

  // Transition state safely
  const newStatus = mapPspStatusToInternal(pspResponse.status);
  transaction.transitionTo(newStatus);

  // Persist
  await transactionRepository.save(transaction);

  return {
    internalTransactionId: transaction.id,
    status: transaction.status,
    psp: pspResponse,
  };
}

export async function getTransactionById(internalId: string) {
  return transactionRepository.findByInternalId(internalId);
}
