import { FastifyInstance } from "fastify";
import { handlePspWebhook } from "../services/webhookService.js";

export async function webhookRoutes(app: FastifyInstance) {
  app.post(
    "/webhooks/psp",
    {
      schema: {
        body: {
          type: "object",
          required: ["transactionId", "status", "final_amount"],
          properties: {
            transactionId: { type: "string" },
            status: { type: "string", enum: ["SUCCESS", "FAILED", "3DS_REQUIRED"] },
            final_amount: { type: "number" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await handlePspWebhook(request.body as any);

        // Log for debugging/monitoring
        request.log.info({ webhookProcessed: result });
        
        if (process.env.NODE_ENV !== "production") {
          return reply.code(200).send(result);
        }
        
        return reply.code(200).send({ received: true });

      } catch (err) {
        request.log.error({ err }, "Webhook processing failed");
      
        if (process.env.NODE_ENV !== "production") {
          return reply.code(400).send({ error: (err as Error).message });
        }
    
        return reply.code(200).send({ received: true });
      }
    }
  );
}