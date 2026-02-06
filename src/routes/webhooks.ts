import { FastifyInstance } from "fastify";
import { handlePspWebhook } from "../services/webhookService.js";

export async function webhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/psp", async (request, reply) => {
    try {
      const body = request.body as any;

      if (!body.transactionId || !body.status) {
        return reply.status(400).send({ error: "transactionId and status are required" });
      }

      const result = handlePspWebhook(body);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
