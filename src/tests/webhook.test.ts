import { describe, it, expect, vi, beforeEach } from "vitest";
import { transactionRepository } from "../../src/repositories/transactionRepository.js";
import { TransactionStatus } from "../../src/domain/TransactionStatus.js";
import { handlePspWebhook } from "../services/webhookService.js";

// Mock the repository to prevent actual DB calls
vi.mock("../../src/repositories/transactionRepository.js");

describe("handlePspWebhook", () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    (transactionRepository.findByPspTransactionId as any).mockResolvedValue(mockTx);

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
      transitionTo: vi.fn(),
    };

    (transactionRepository.findByPspTransactionId as any).mockResolvedValue(mockTx);

    const result = await handlePspWebhook({
      transactionId: "psp123",
      status: "SUCCESS",
      final_amount: 100,
    });

    // If the status is already SUCCESS, we should NOT call transitionTo or update again
    expect(mockTx.transitionTo).not.toHaveBeenCalled();
    expect(transactionRepository.update).not.toHaveBeenCalled();
    expect(result.status).toBe(TransactionStatus.SUCCESS);
  });

  it("throws if transaction not found", async () => {
    (transactionRepository.findByPspTransactionId as any).mockResolvedValue(null);

    await expect(
      handlePspWebhook({ transactionId: "x", status: "SUCCESS" }),
    ).rejects.toThrow("Transaction not found");
  });

  it("should reject invalid state transitions", async () => {
    const mockTx = {
      status: TransactionStatus.SUCCESS,
      transitionTo: vi.fn(() => {
        // Simulating the Domain Logic rejection
        throw new Error("Invalid transition from SUCCESS to PENDING_3DS");
      }),
    };

    (transactionRepository.findByPspTransactionId as any).mockResolvedValue(mockTx);

    await expect(
      handlePspWebhook({
        transactionId: "psp123",
        status: "3DS_REQUIRED", // maps to PENDING_3DS
      })
    ).rejects.toThrow("Invalid transition");
  });
});