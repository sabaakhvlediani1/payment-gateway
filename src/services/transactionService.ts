import { createPspTransaction } from "../psp/pspSimulator.js";
import { Transaction } from "../domain/Transaction.js";
import { TransactionStatus } from "../domain/TransactionStatus.js";

import { randomUUID } from "crypto";
import { transactionRepository } from "../repositories/transactionRepository.js";

const PSP_MAX_RETRIES = 3;
const PSP_RETRY_DELAY_MS = 500;

async function callPspWithRetry(
  payload: CreateTransactionPayload,
  attempt = 1
): ReturnType<typeof createPspTransaction> {
  try {
    return await createPspTransaction(payload);
  } catch (err) {
    if (attempt >= PSP_MAX_RETRIES) {
      throw err;
    }
    const delay = PSP_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return callPspWithRetry(payload, attempt + 1);
  }
}

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

  const transaction = Transaction.create(internalId, payload.amount, payload.currency, payload.orderId);

  await transactionRepository.save(transaction);

  const pspResponse = await callPspWithRetry(payload);

  transaction.attachPspTransactionId(pspResponse.transactionId);

  const newStatus = mapPspStatusToInternal(pspResponse.status);
  transaction.transitionTo(newStatus);

  await transactionRepository.update(transaction);

  return {
    internalTransactionId: transaction.id,
    status: transaction.status,
    psp: pspResponse,
  };
}

export async function getTransactionById(internalId: string) {
  return transactionRepository.findByInternalId(internalId);
}
