import { describe, it, expect } from "vitest";
import { TransactionStatus } from "../domain/TransactionStatus.js";
import {
  canTransition,
} from "../domain/TransactionStateMachine.js";

describe("Transaction State Machine", () => {
  it("allows valid transitions", () => {
    expect(
      canTransition(TransactionStatus.CREATED, TransactionStatus.SUCCESS)
    ).toBe(true);

    expect(
      canTransition(
        TransactionStatus.PENDING_3DS,
        TransactionStatus.FAILED
      )
    ).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(
      canTransition(TransactionStatus.SUCCESS, TransactionStatus.CREATED)
    ).toBe(false);

    expect(
      canTransition(
        TransactionStatus.FAILED,
        TransactionStatus.PENDING_3DS
      )
    ).toBe(false);
  });
});
