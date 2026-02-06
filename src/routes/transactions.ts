import { FastifyInstance } from "fastify";
import { createTransaction, getTransaction } from "../services/transactionService.js";

export async function transactionRoutes(app: FastifyInstance) {
  // Create transaction
  app.post("/transactions", async (request, reply) => {
    try {
      const body = request.body as any;

      // Basic validation
      const requiredFields = [
        "amount",
        "currency",
        "cardNumber",
        "cardExpiry",
        "cvv",
        "orderId",
        "callbackUrl",
        "failureUrl",
      ];

      for (const field of requiredFields) {
        if (!body[field]) {
          return reply.status(400).send({ error: `${field} is required` });
        }
      }

      const result = await createTransaction(body);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Optional: fetch transaction by internal ID
  app.get("/transactions/:id", async (request, reply) => {
    const { id } = request.params as any;
    const transaction = getTransaction(id);
    if (!transaction) {
      return reply.status(404).send({ error: "Transaction not found" });
    }
    return reply.send(transaction);
  });
}
