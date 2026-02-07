import { FastifyInstance } from "fastify";
import { handlePspWebhook } from "../services/webhookService.js";

export async function webhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/psp", {
    schema: {
      body: {
        type: "object",
        required: ["transactionId", "status", "final_amount"],
        properties: {
          transactionId: { type: "string" },
          status: { type: "string" },
          final_amount: { type: "number" },
        },
      },
    },
  }, async (request, reply) => {
    try {
      await handlePspWebhook(request.body as any);

      // Always acknowledge receipt to avoid PSP retries
      return reply.code(200).send({ received: true });
    } catch (err) {
      request.log.error(err);

      // Still return 200 so PSP doesn’t retry forever
      return reply.code(200).send({ received: true });
    }
  });
}
