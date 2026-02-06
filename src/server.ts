import { buildApp } from "./app/app.js";

const app = buildApp();

const start = async () => {
  try {
    // Adding '0.0.0.0' tells Fastify to listen on all available addresses
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log("🚀 Server is running on http://localhost:3000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
