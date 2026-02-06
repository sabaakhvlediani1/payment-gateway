import { describe, it, expect, beforeEach } from "vitest";
import { transactions, createTransaction } from "../services/transactionService.js";
import { handlePspWebhook, WebhookPayload } from "../services/webhookService.js";
import { TransactionStatus } from "../domain/TransactionStatus.js";

// Clear in-memory storage before each test
beforeEach(() => {
  transactions.clear();
});

describe("Webhook Handler", () => {
  it("updates transaction status correctly", async () => {
    // Create a transaction
    const { internalTransactionId, psp } = await createTransaction({
      amount: 1000,
      currency: "EUR",
      cardNumber: "5555", // success card
      cardExpiry: "12/25",
      cvv: "123",
      orderId: "order_001",
      callbackUrl: "http://localhost:3000/webhooks/psp",
      failureUrl: "http://localhost:3000/failure/psp",
    });

    // Send webhook to update status to SUCCESS
    const payload: WebhookPayload = {
      transactionId: psp.transactionId,
      status: "SUCCESS",
      final_amount: 1500,
    };

    const result = handlePspWebhook(payload);

    expect(result.updated).toBe(true);

    const updatedTransaction = transactions.get(internalTransactionId)!;
    expect(updatedTransaction.status).toBe(TransactionStatus.SUCCESS);
    expect(updatedTransaction.amount).toBe(1500);
  });

  it("ignores duplicate webhooks (idempotency)", async () => {
    const { internalTransactionId, psp } = await createTransaction({
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
    const first = handlePspWebhook(payload);
    expect(first.updated).toBe(true);

    // Send duplicate webhook
    const second = handlePspWebhook(payload);
    expect(second.ignored).toBe(true);

    const transaction = transactions.get(internalTransactionId)!;
    expect(transaction.status).toBe(TransactionStatus.SUCCESS);
    expect(transaction.amount).toBe(500);
  });

  it("updates amount if provided in webhook", async () => {
    const { internalTransactionId, psp } = await createTransaction({
      amount: 700,
      currency: "EUR",
      cardNumber: "5555",
      cardExpiry: "12/25",
      cvv: "123",
      orderId: "order_003",
      callbackUrl: "http://localhost:3000/webhooks/psp",
      failureUrl: "http://localhost:3000/failure/psp",
    });

    const payload: WebhookPayload = {
      transactionId: psp.transactionId,
      status: "SUCCESS",
      final_amount: 900,
    };

    handlePspWebhook(payload);

    const transaction = transactions.get(internalTransactionId)!;
    expect(transaction.amount).toBe(900);
  });
});
