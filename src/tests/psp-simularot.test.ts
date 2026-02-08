import { describe, it, expect } from "vitest";
import { createPspTransaction } from "../../src/psp/pspSimulator.js";

const baseRequest = {
  amount: 100,
  currency: "USD",
  cardExpiry: "12/30",
  cvv: "123",
  orderId: "order-test",
  callbackUrl: "http://localhost/webhook",
  failureUrl: "http://localhost/fail",
};

describe("PSP Simulator", () => {
  it("returns SUCCESS for card starting with 5555", async () => {
    const res = await createPspTransaction({
      ...baseRequest,
      cardNumber: "5555123412341234",
    });

    expect(res.status).toBe("SUCCESS");
  });

  it("returns FAILED for card starting with 4000", async () => {
    const res = await createPspTransaction({
      ...baseRequest,
      cardNumber: "4000123412341234",
    });

    expect(res.status).toBe("FAILED");
  });

  it("returns PENDING_3DS and redirect URL for 4111", async () => {
    const res = await createPspTransaction({
      ...baseRequest,
      cardNumber: "4111111111111111",
    });

    expect(res.status).toBe("PENDING_3DS");
    expect(res.threeDsRedirectUrl).toContain("/psp/3ds/");
  });
});
