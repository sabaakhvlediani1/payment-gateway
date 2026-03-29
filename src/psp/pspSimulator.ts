import { setTimeout } from "timers/promises";
import { randomUUID } from "crypto";

export type PspStatus = "PENDING_3DS" | "SUCCESS" | "FAILED";

const WEBHOOK_DELAY_MS = 1000;    // Simulates PSP network latency before callback
const THREE_DS_DELAY_MS = 2000;   // Simulates customer completing 3DS challenge

interface PspTransactionRequest {
  amount: number;
  currency: string;
  cardNumber: string;
  cardExpiry: string;
  cvv: string;
  orderId: string;
  callbackUrl: string;
  failureUrl: string;
}

interface PspTransactionResponse {
  transactionId: string;
  status: PspStatus;
  threeDsRedirectUrl?: string;
}

export async function createPspTransaction(
  req: PspTransactionRequest
): Promise<PspTransactionResponse> {
  const prefix = req.cardNumber.slice(0, 4);
  const transactionId = `tx_${randomUUID()}`;

  // Note: req.failureUrl is accepted per PSP contract but not used in this simulator.
  // A real PSP would redirect the user to failureUrl on terminal failure.

  switch (prefix) {
    case "4111":
      return {
        transactionId,
        status: "PENDING_3DS",
        threeDsRedirectUrl: `http://localhost:3000/psp/3ds/${transactionId}?callbackUrl=${encodeURIComponent(req.callbackUrl)}&amount=${req.amount}`,
      };

    case "5555":
      // Fire webhook in background — do NOT await, so we return the transactionId
      // to the service first, allowing it to persist to DB before webhook arrives
      sendPspWebhook(transactionId, req.callbackUrl, req.amount, "SUCCESS");
      return { transactionId, status: "SUCCESS" };

    case "4000":
    default:
      // Same as above — fire and forget so DB is updated before webhook arrives
      sendPspWebhook(transactionId, req.callbackUrl, req.amount, "FAILED");
      return { transactionId, status: "FAILED" };
  }
}

export async function complete3dsChallenge(
  transactionId: string,
  callbackUrl: string,
  amount: number
) {
  await setTimeout(THREE_DS_DELAY_MS);

  const finalStatus: "SUCCESS" | "FAILED" =
    transactionId.length % 2 === 0 ? "SUCCESS" : "FAILED";

  await sendPspWebhook(transactionId, callbackUrl, amount, finalStatus);

  return { transactionId, finalStatus };
}

export async function sendPspWebhook(
  transactionId: string,
  callbackUrl: string,
  finalAmount: number,
  finalStatus: "SUCCESS" | "FAILED"
) {
  // Do not send real HTTP requests during tests
  if (process.env.NODE_ENV === "test") return;

  await setTimeout(WEBHOOK_DELAY_MS);

  await fetch(callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transactionId,
      final_amount: finalAmount,
      status: finalStatus,
    }),
  });
}

