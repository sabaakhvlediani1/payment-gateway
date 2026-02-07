import { describe, it, expect, vi } from "vitest";

import { transactionRepository } from "../../src/repositories/transactionRepository.js";
import { TransactionStatus } from "../../src/domain/TransactionStatus.js";
import { handlePspWebhook } from "../services/webhookService.js";

vi.mock("../../src/repositories/transactionRepository.js");

describe("handlePspWebhook", () => {
  it("updates transaction to SUCCESS", async () => {
    const mockTx = {
      amount: 100,
      status: TransactionStatus.PENDING_3DS,
      updateAmount: vi.fn((newAmount: number) => {
        mockTx.amount = newAmount;
      }),
      transitionTo: vi.fn((newStatus: TransactionStatus) => {
        mockTx.status = newStatus;
      }),
    };

    (transactionRepository.findByPspTransactionId as any).mockResolvedValue(
      mockTx,
    );

    const result = await handlePspWebhook({
      transactionId: "psp123",
      status: "SUCCESS",
      final_amount: 120,
    });

    expect(mockTx.updateAmount).toHaveBeenCalledWith(120);
    expect(mockTx.transitionTo).toHaveBeenCalledWith(TransactionStatus.SUCCESS);
    expect(transactionRepository.update).toHaveBeenCalledWith(mockTx);
    expect(result.status).toBe(TransactionStatus.SUCCESS);
    expect(result.amount).toBe(120);
  });

  it("is idempotent when same webhook arrives twice", async () => {
    const mockTx = {
      amount: 100,
      status: TransactionStatus.SUCCESS,
      updateAmount: vi.fn(),
      transitionTo: vi.fn(), // still mocked
    };

    (transactionRepository.findByPspTransactionId as any).mockResolvedValue(
      mockTx,
    );

    const result = await handlePspWebhook({
      transactionId: "psp123",
      status: "SUCCESS",
      final_amount: 100,
    });

    expect(mockTx.transitionTo).toHaveBeenCalledWith(TransactionStatus.SUCCESS);
    expect(transactionRepository.update).toHaveBeenCalledWith(mockTx);
    expect(result.status).toBe(TransactionStatus.SUCCESS);
  });

  it("throws if transaction not found", async () => {
    (transactionRepository.findByPspTransactionId as any).mockResolvedValue(
      null,
    );

    await expect(
      handlePspWebhook({ transactionId: "x", status: "SUCCESS" }),
    ).rejects.toThrow("Transaction not found");
  });
});
