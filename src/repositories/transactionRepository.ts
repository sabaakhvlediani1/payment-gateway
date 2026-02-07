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
        amount
      )
      VALUES ($1, $2, $3, $4)
      `,
      [
        transaction.id,
        transaction.pspTransactionId ?? null,
        transaction.status,
        transaction.amount,
      ]
    );
  }

  async findByInternalId(internalId: string): Promise<Transaction | null> {
    const res = await query(
      `
      SELECT internal_id, psp_transaction_id, status, amount
      FROM transactions
      WHERE internal_id = $1
      `,
      [internalId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];

    return Transaction.restore(
      row.internal_id,
      row.status as TransactionStatus,
      Number(row.amount),
      row.psp_transaction_id ?? undefined
    );
  }

  async update(transaction: Transaction): Promise<void> {
    await query(
      `
      UPDATE transactions
      SET
        status = $1,
        amount = $2,
        psp_transaction_id = $3
      WHERE internal_id = $4
      `,
      [
        transaction.status,
        transaction.amount,
        transaction.pspTransactionId ?? null,
        transaction.id,
      ]
    );
  }

  async findByPspTransactionId(
    pspTransactionId: string
  ): Promise<Transaction | null> {
    const res = await query(
      `
      SELECT internal_id, psp_transaction_id, status, amount
      FROM transactions
      WHERE psp_transaction_id = $1
      `,
      [pspTransactionId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];

    return Transaction.restore(
      row.internal_id,
      row.status as TransactionStatus,
      Number(row.amount),
      row.psp_transaction_id ?? undefined
    );
  }
}

export const transactionRepository = new TransactionRepository();
