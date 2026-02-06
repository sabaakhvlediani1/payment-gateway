import { transactions } from "./transactionService.js";
import { Transaction } from "../domain/Transaction.js";
import { TransactionStatus } from "../domain/TransactionStatus.js";

export interface WebhookPayload {
  transactionId: string; // PSP transaction ID
  final_amount?: number;
  status: "SUCCESS" | "FAILED" | "3DS_REQUIRED";
}

// Keep track of already processed PSP webhooks for idempotency
const processedWebhooks = new Set<string>();

export function handlePspWebhook(payload: WebhookPayload) {
  const uniqueWebhookKey = `${payload.transactionId}-${payload.status}-${payload.final_amount || 0}`;

  // Idempotency: ignore duplicates
  if (processedWebhooks.has(uniqueWebhookKey)) {
    console.log(`[Webhook] Duplicate webhook ignored: ${uniqueWebhookKey}`);
    return { ignored: true };
  }
  processedWebhooks.add(uniqueWebhookKey);

  const transaction = [...transactions.values()].find(
    (t) => t.pspTransactionId === payload.transactionId
  );

  if (!transaction) {
    throw new Error(`Transaction not found for PSP ID ${payload.transactionId}`);
  }

  // Update amount if provided
  if (payload.final_amount !== undefined) {
    transaction.amount = payload.final_amount;
  }

  // Only transition if status is different
  const targetStatus = mapPspStatusToInternal(payload.status);
  if (transaction.status !== targetStatus) {
    transaction.transitionTo(targetStatus);
  }

  return { updated: true, status: transaction.status };
}

// Helper function
function mapPspStatusToInternal(status: string) {
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


// Helper: get all transactions from in-memory map
function getAllTransactions(): Transaction[] {
  return Array.from(transactions.values());
}
