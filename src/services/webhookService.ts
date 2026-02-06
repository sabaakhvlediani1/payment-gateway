import { query } from "../db.js";
import { TransactionStatus } from "../domain/TransactionStatus.js";

export interface WebhookPayload {
  transactionId: string; // PSP transaction ID
  final_amount?: number;
  status: "SUCCESS" | "FAILED" | "3DS_REQUIRED";
}

// Simple in-memory idempotency (OK for now)
const processedWebhooks = new Set<string>();

export async function handlePspWebhook(payload: WebhookPayload) {
  const uniqueWebhookKey = `${payload.transactionId}-${payload.status}-${payload.final_amount || 0}`;

  // Idempotency
  if (processedWebhooks.has(uniqueWebhookKey)) {
    console.log(`[Webhook] Duplicate webhook ignored: ${uniqueWebhookKey}`);
    return { ignored: true };
  }
  processedWebhooks.add(uniqueWebhookKey);

  // Fetch transaction by PSP transaction ID
  const res = await query(
    `SELECT * FROM transactions WHERE psp_transaction_id = $1`,
    [payload.transactionId]
  );

  const transaction = res.rows[0];
  if (!transaction) {
    throw new Error(`Transaction not found for PSP ID ${payload.transactionId}`);
  }

  // Map PSP status → internal status
  const targetStatus = mapPspStatusToInternal(payload.status);

  // Avoid invalid state transitions (SUCCESS → SUCCESS etc.)
  if (transaction.status === targetStatus) {
    return { updated: false, status: transaction.status };
  }

  // Update DB
  if (payload.final_amount !== undefined) {
    await query(
      `UPDATE transactions
       SET status = $1, amount = $2
       WHERE internal_id = $3`,
      [targetStatus, payload.final_amount, transaction.internal_id]
    );
  } else {
    await query(
      `UPDATE transactions
       SET status = $1
       WHERE internal_id = $2`,
      [targetStatus, transaction.internal_id]
    );
  }

  return { updated: true, status: targetStatus };
}

// Helper
function mapPspStatusToInternal(status: string): TransactionStatus {
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
