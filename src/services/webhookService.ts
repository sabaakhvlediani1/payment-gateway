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
  // Load transaction
  const transaction =
    await transactionRepository.findByPspTransactionId(
      payload.transactionId
    );

  if (!transaction) {
    throw new Error(
      `Transaction not found for PSP ID ${payload.transactionId}`
    );
  }

  // Update amount if provided
  if (payload.final_amount !== undefined) {
    transaction.updateAmount(payload.final_amount);
  }

  // Map & transition state (idempotent by design)
  const targetStatus = mapPspStatusToInternal(payload.status);
  transaction.transitionTo(targetStatus);

  // Persist
  await transactionRepository.update(transaction);

  return {
    status: transaction.status,
    amount: transaction.amount,
  };
}
