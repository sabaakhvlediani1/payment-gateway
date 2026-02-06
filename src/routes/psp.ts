import { FastifyInstance } from "fastify";
import {
  createPspTransaction,
  sendPspWebhook,
} from "../psp/pspSimulator.js";

export async function pspRoutes(app: FastifyInstance) {
  app.post("/psp/transactions", async (request, reply) => {
    const body = request.body as any;

    if (
      !body.amount ||
      !body.currency ||
      !body.cardNumber ||
      !body.cardExpiry ||
      !body.cvv ||
      !body.orderId ||
      !body.callbackUrl ||
      !body.failureUrl
    ) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const pspResponse = await createPspTransaction(body);

    // If 3DS, simulate webhook after user finishes 3DS
    if (pspResponse.status === "PENDING_3DS" && pspResponse.threeDsRedirectUrl) {
      // simulate 3DS success after 5 sec
      sendPspWebhook(
        pspResponse.transactionId,
        body.callbackUrl,
        "SUCCESS",
        body.amount
      );
    }

    return reply.send(pspResponse);
  });

  // Fake 3DS endpoint
  app.get("/psp/3ds/:transactionId", async (request, reply) => {
    const { transactionId } = request.params as any;
    return reply.send({
      message: `Simulated 3DS page for transaction ${transactionId}`,
      completeUrl: `http://localhost:3000/webhooks/psp`,
    });
  });
}
