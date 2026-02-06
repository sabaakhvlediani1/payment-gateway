import { describe, it, expect, beforeEach } from "vitest";
import { query, pool } from "../db.js"; // Import your DB tools
import { createTransaction } from "../services/transactionService.js";
import { handlePspWebhook, WebhookPayload } from "../services/webhookService.js";
import { TransactionStatus } from "../domain/TransactionStatus.js";

describe("Webhook Handler (Integration)", () => {
  
  // Clean the database table before each test to ensure a fresh start
  beforeEach(async () => {
    await query("DELETE FROM transactions");
  });

  it("updates transaction status correctly in PostgreSQL", async () => {
    // 1. Create a transaction (this now inserts into Postgres)
    const { internalTransactionId, psp } = await createTransaction({
      amount: 1000,
      currency: "EUR",
      cardNumber: "5555",
      cardExpiry: "12/25",
      cvv: "123",
      orderId: "order_001",
      callbackUrl: "http://localhost:3000/webhooks/psp",
      failureUrl: "http://localhost:3000/failure/psp",
    });

    // 2. Mock the incoming webhook payload
    const payload: WebhookPayload = {
      transactionId: psp.transactionId,
      status: "SUCCESS",
      final_amount: 1500,
    };

    // 3. Handle webhook (Don't forget 'await'!)
    const result = await handlePspWebhook(payload);
    expect(result.updated).toBe(true);

    // 4. Verify by querying the real Database
    const res = await query("SELECT * FROM transactions WHERE internal_id = $1", [internalTransactionId]);
    const updatedTransaction = res.rows[0];

    expect(updatedTransaction.status).toBe(TransactionStatus.SUCCESS);
    expect(updatedTransaction.amount).toBe("1500"); // Note: NUMERIC often returns as string in pg
  });

  it("ignores duplicate webhooks (idempotency)", async () => {
    const { psp } = await createTransaction({
      amount: 500,
      currency: "EUR",
      cardNumber: "5555",
      cardExpiry: "12/25",
      cvv: "123",
      orderId: "order_002",
      callbackUrl: "http://localhost:3000/webhooks/psp",
      failureUrl: "http://localhost:3000/failure/psp",
    });

    const payload: WebhookPayload = {
      transactionId: psp.transactionId,
      status: "SUCCESS",
      final_amount: 500,
    };

    // Send first webhook
    const first = await handlePspWebhook(payload);
    expect(first.updated).toBe(true);

    // Send duplicate webhook
    const second = await handlePspWebhook(payload);
    expect(second.ignored).toBe(true);
  });
});