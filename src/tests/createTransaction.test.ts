import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTransaction } from "../../src/services/transactionService.js";
import { transactionRepository } from "../../src/repositories/transactionRepository.js";
import * as psp from "../../src/psp/pspSimulator.js";
import { TransactionStatus } from "../../src/domain/TransactionStatus.js";

vi.mock("../../src/repositories/transactionRepository.js");
vi.mock("../../src/psp/pspSimulator.js");

const payload = {
  amount: 100,
  currency: "USD",
  cardNumber: "4111111111111111",
  cardExpiry: "12/30",
  cvv: "123",
  orderId: "order1",
  callbackUrl: "http://localhost:3000/webhooks/psp",
  failureUrl: "http://localhost:3000/fail",
};

describe("createTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves with CREATED status first, then updates after PSP responds with SUCCESS", async () => {
    (psp.createPspTransaction as any).mockResolvedValue({
      transactionId: "psp123",
      status: "SUCCESS",
    });

    const result = await createTransaction(payload);

    // Transaction must be saved to DB before PSP is called (race condition fix)
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
    // Then updated after PSP responds
    expect(transactionRepository.update).toHaveBeenCalledTimes(1);

    expect(result.status).toBe(TransactionStatus.SUCCESS);
    expect(result.psp.transactionId).toBe("psp123");
  });

  it("throws and does not call update if PSP call fails", async () => {
    (psp.createPspTransaction as any).mockRejectedValue(new Error("PSP down"));

    await expect(createTransaction(payload)).rejects.toThrow("PSP down");

    // save was called (transaction persisted as CREATED) but update was never reached
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
    expect(transactionRepository.update).not.toHaveBeenCalled();
  });

  it("saves with CREATED first, then updates to PENDING_3DS when PSP requires 3DS", async () => {
    (psp.createPspTransaction as any).mockResolvedValue({
      transactionId: "psp123",
      status: "PENDING_3DS",
    });

    const result = await createTransaction(payload);

    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
    expect(transactionRepository.update).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(TransactionStatus.PENDING_3DS);
  });
});
