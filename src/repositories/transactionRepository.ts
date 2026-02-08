import { query } from "../db.js";
import { Transaction } from "../domain/Transaction.js";
import { TransactionStatus } from "../domain/TransactionStatus.js";

class TransactionRepository {
  async save(transaction: Transaction): Promise<void> {
    await query(
      `
      INSERT INTO transactions (
        internal_id,
        psp_transaction_id,
        status,
        amount,
        final_amount -- Add this
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        transaction.id,
        transaction.pspTransactionId ?? null,
        transaction.status,
        transaction.amount,
        transaction.finalAmount ?? null, // Add this
      ]
    );
  }

  async update(transaction: Transaction): Promise<void> {
    await query(
      `
      UPDATE transactions
      SET
        status = $1,
        amount = $2,
        psp_transaction_id = $3,
        final_amount = $4 -- Add this
      WHERE internal_id = $5
      `,
      [
        transaction.status,
        transaction.amount,
        transaction.pspTransactionId ?? null,
        transaction.finalAmount ?? null, // Add this
        transaction.id,
      ]
    );
  }

  // Update BOTH findByInternalId and findByPspTransactionId
  // to include final_amount in the SELECT and the Transaction.restore call
  async findByPspTransactionId(pspTransactionId: string): Promise<Transaction | null> {
    const res = await query(
      `
      SELECT internal_id, psp_transaction_id, status, amount, final_amount
      FROM transactions
      WHERE psp_transaction_id = $1
      `,
      [pspTransactionId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    return Transaction.restore(
      row.internal_id,
      row.status as TransactionStatus,
      Number(row.amount),
      row.psp_transaction_id ?? undefined,
      row.final_amount ? Number(row.final_amount) : undefined // Pass final_amount here
    );
  }
}

export const transactionRepository = new TransactionRepository();
