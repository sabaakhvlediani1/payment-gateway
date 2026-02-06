import Fastify from "fastify";
import { registerSwagger } from "../plugins/swagger.js";
import { healthRoutes } from "../routes/health.js";
import { pspRoutes } from "../routes/psp.js";
import { transactionRoutes } from "../routes/transactions.js";
import { webhookRoutes } from "../routes/webhooks.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  registerSwagger(app);
  app.register(healthRoutes);
  app.register(pspRoutes);
  app.register(transactionRoutes);
   app.register(webhookRoutes); 

  return app;
}
