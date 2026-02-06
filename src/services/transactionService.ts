import { createPspTransaction } from "../psp/pspSimulator.js";
import { TransactionStatus } from "../domain/TransactionStatus.js";
import { query } from "../db.js";

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
  const internalId = `internal_${Math.random().toString(36).substring(2, 10)}`;

  // Call PSP
  const pspResponse = await createPspTransaction(payload);

  // Map PSP status
  let status: TransactionStatus = TransactionStatus.CREATED;
  if (pspResponse.status === "SUCCESS") status = TransactionStatus.SUCCESS;
  if (pspResponse.status === "FAILED") status = TransactionStatus.FAILED;
  if (pspResponse.status === "PENDING_3DS") status = TransactionStatus.PENDING_3DS;

  // Save to DB
  await query(
    `INSERT INTO transactions (internal_id, psp_transaction_id, status, amount)
     VALUES ($1, $2, $3, $4)`,
    [internalId, pspResponse.transactionId, status, payload.amount]
  );

  return {
    internalTransactionId: internalId,
    status,
    psp: pspResponse,
  };
}

export async function getTransaction(internalId: string) {
  const res = await query(
    `SELECT * FROM transactions WHERE internal_id = $1`,
    [internalId]
  );
  return res.rows[0];
}

export async function updateTransaction(
  internalId: string,
  status: TransactionStatus,
  amount?: number
) {
  if (amount !== undefined) {
    await query(
      `UPDATE transactions SET status = $1, amount = $2 WHERE internal_id = $3`,
      [status, amount, internalId]
    );
  } else {
    await query(
      `UPDATE transactions SET status = $1 WHERE internal_id = $2`,
      [status, internalId]
    );
  }
}
