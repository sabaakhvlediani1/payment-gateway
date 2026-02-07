import { FastifyInstance } from "fastify";
import { createTransaction, getTransactionById } from "../services/transactionService.js";

export async function transactionRoutes(app: FastifyInstance) {
  app.post("/transactions", {
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
  }, async (request, reply) => {
    try {
      const result = await createTransaction(request.body as any);
      return reply.code(201).send(result);
    } catch (err: any) {
      if (err.name === "ValidationError") {
        return reply.code(400).send({ error: err.message });
      }
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  app.get("/transactions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const transaction = await getTransactionById(id);

    if (!transaction) {
      return reply.code(404).send({ error: "Transaction not found" });
    }

    return reply.send(transaction);
  });
}
