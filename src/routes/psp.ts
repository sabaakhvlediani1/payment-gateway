import { FastifyInstance } from "fastify";
import { createPspTransaction, sendPspWebhook } from "../psp/pspSimulator.js";

export async function pspRoutes(app: FastifyInstance) {
  app.post(
    "/psp/transactions",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "amount",
            "currency",
            "cardNumber",
            "cardExpiry",
            "cvv",
            "orderId",
            "callbackUrl",
            "failureUrl",
          ],
          properties: {
            amount: { type: "number" },
            currency: { type: "string" },
            cardNumber: { type: "string" },
            cardExpiry: { type: "string" },
            cvv: { type: "string" },
            orderId: { type: "string" },
            callbackUrl: { type: "string" },
            failureUrl: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as any;
      const pspResponse = await createPspTransaction(body);
      return reply.send(pspResponse);
    },
  );

  // Fake 3DS completion endpoint
  app.get("/psp/3ds/:transactionId", async (request, reply) => {
    const { transactionId } = request.params as { transactionId: string };
    const { callbackUrl, amount } = request.query as {
      callbackUrl: string;
      amount: string;
    };

    setTimeout(() => {
      sendPspWebhook(transactionId, callbackUrl, Number(amount), "SUCCESS");
    }, 5000);

    return reply.send({
      message: `3DS authentication completed for ${transactionId}`,
    });
  });
}
