import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import authPlugin from "./plugins/auth";
import { healthRoutes } from "./routes/health";
import { leadRoutes } from "./routes/leads";
import { followUpRoutes } from "./routes/follow-ups";
import { userRoutes } from "./routes/users";
import { productRoutes } from "./routes/products";
import { quotationRoutes } from "./routes/quotations";
import { inboxRoutes } from "./routes/inbox";
import { reportRoutes } from "./routes/reports";
import { whatsappRoutes } from "./routes/whatsapp";
import { autoFollowUpRuleRoutes } from "./routes/auto-followup-rules";
import { aiRoutes } from "./routes/ai";
import { uploadRoutes } from "./routes/uploads";
import { quoteTemplateRoutes } from "./routes/quote-templates";
// import { startFollowUpWorker } from "./workers/followup.worker";

const PORT = Number(process.env.PORT || process.env.API_PORT) || 4000;
const HOST = process.env.API_HOST || "0.0.0.0";

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
    credentials: true,
  });

  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(authPlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(leadRoutes);
  await app.register(followUpRoutes);
  await app.register(userRoutes);
  await app.register(productRoutes);
  await app.register(quotationRoutes);
  await app.register(inboxRoutes);
  await app.register(reportRoutes);
  await app.register(whatsappRoutes);
  await app.register(autoFollowUpRuleRoutes);
  await app.register(aiRoutes);
  await app.register(uploadRoutes);
  await app.register(quoteTemplateRoutes);

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`API running on http://${HOST}:${PORT}`);
    // startFollowUpWorker();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
