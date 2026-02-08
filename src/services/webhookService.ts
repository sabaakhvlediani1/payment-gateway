import { transactionRepository } from "../repositories/transactionRepository.js";
import { TransactionStatus } from "../domain/TransactionStatus.js";

export interface WebhookPayload {
  transactionId: string; // PSP transaction ID
  final_amount?: number;
  status: "SUCCESS" | "FAILED" | "3DS_REQUIRED";
}

function mapPspStatusToInternal(
  status: WebhookPayload["status"]
): TransactionStatus {
  switch (status) {
    case "SUCCESS":
      return TransactionStatus.SUCCESS;
    case "FAILED":
      return TransactionStatus.FAILED;
    case "3DS_REQUIRED":
      return TransactionStatus.PENDING_3DS;
    default:
      throw new Error(`Unknown PSP status: ${status}`);
  }
}

export async function handlePspWebhook(payload: WebhookPayload) {
  const transaction = await transactionRepository.findByPspTransactionId(payload.transactionId);

  if (!transaction) {
    throw new Error(`Transaction not found for PSP ID ${payload.transactionId}`);
  }

  const targetStatus = mapPspStatusToInternal(payload.status);

  // --- IDEMPOTENCY CHECK ---
  // If the status is already the same, we skip processing to "ignore" the duplicate.
  if (transaction.status === targetStatus) {
    return {
      status: transaction.status,
      amount: transaction.amount,
      ignored: true // Optional flag for internal logging
    };
  }

  if (payload.final_amount !== undefined) {
    transaction.updateAmount(payload.final_amount);
  }

  // This should throw an error if the transition is illegal (e.g., SUCCESS -> FAILED)
  transaction.transitionTo(targetStatus);

  await transactionRepository.update(transaction);

  return {
    status: transaction.status,
    amount: transaction.amount,
  };
}
