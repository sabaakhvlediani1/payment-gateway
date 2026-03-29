import { setTimeout } from "timers/promises";
import { randomUUID } from "crypto";

export type PspStatus = "PENDING_3DS" | "SUCCESS" | "FAILED";

const WEBHOOK_DELAY_MS = 1000;
const THREE_DS_DELAY_MS = 2000;

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

  switch (prefix) {
    case "4111":
      return {
        transactionId,
        status: "PENDING_3DS",
        threeDsRedirectUrl: `http://localhost:3000/psp/3ds/${transactionId}?callbackUrl=${encodeURIComponent(req.callbackUrl)}&amount=${req.amount}`,
      };

    case "5555":
      sendPspWebhook(transactionId, req.callbackUrl, req.amount, "SUCCESS");
      return { transactionId, status: "SUCCESS" };

    case "4000":
    default:
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
