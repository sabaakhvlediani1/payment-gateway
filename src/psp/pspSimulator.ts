import { setTimeout } from "timers/promises";

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
  status: "PENDING_3DS" | "SUCCESS" | "FAILED";
  threeDsRedirectUrl?: string;
}

export async function createPspTransaction(
  req: PspTransactionRequest
): Promise<PspTransactionResponse> {
  const prefix = req.cardNumber.slice(0, 4);
  const transactionId = `tx_${Math.random().toString(36).substring(2, 10)}`;

  switch (prefix) {
    case "4111":
      return {
        transactionId,
        status: "PENDING_3DS",
        threeDsRedirectUrl: `http://localhost:3000/psp/3ds/${transactionId}`,
      };
    case "5555":
      return {
        transactionId,
        status: "SUCCESS",
      };
    case "4000":
      return {
        transactionId,
        status: "FAILED",
      };
    default:
      return {
        transactionId,
        status: "FAILED",
      };
  }
}


 // Simulate sending webhook after delay
 
export async function sendPspWebhook(
  transactionId: string,
  callbackUrl: string,
  finalStatus: "SUCCESS" | "FAILED",
  finalAmount: number
) {
  // simulate async delay
  await setTimeout(3000);

  // in real scenario we would call callbackUrl via HTTP POST
  console.log(
    `[PSP Simulator] Sending webhook to ${callbackUrl} for ${transactionId} with status ${finalStatus}`
  );
  // For now we just log; real implementation will use axios.post(callbackUrl, {...})
}
