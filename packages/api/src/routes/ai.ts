import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { isAIAvailable, generateFollowUpMessage } from "../services/ai";
import { z } from "zod";

const generateSchema = z.object({
  leadId: z.string().uuid().optional(),
  leadContext: z
    .object({
      name: z.string(),
      status: z.string().optional(),
      productInterest: z.array(z.string()).optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
      lastInteraction: z.string().optional(),
    })
    .optional(),
  actionType: z.string(),
  customInstructions: z.string().optional(),
});

export async function aiRoutes(app: FastifyInstance) {
  // GET /ai/status
  app.get("/ai/status", { preHandler: [requireAuth] }, async () => {
    return { available: isAIAvailable() };
  });

  // POST /ai/generate-message
  app.post(
    "/ai/generate-message",
    { preHandler: [requireAuth] },
    async (request) => {
      if (!isAIAvailable()) {
        throw { statusCode: 503, message: "AI service not configured" };
      }

      const body = generateSchema.parse(request.body);

      let context = body.leadContext;

      if (body.leadId && !context) {
        const lead = await prisma.lead.findUnique({
          where: { id: body.leadId },
        });
        if (!lead) throw { statusCode: 404, message: "Lead not found" };

        const lastActivity = await prisma.activity.findFirst({
          where: { leadId: body.leadId },
          orderBy: { createdAt: "desc" },
        });

        context = {
          name: lead.name,
          status: lead.status,
          productInterest: lead.productInterest,
          source: lead.source || undefined,
          notes: lead.notes || undefined,
          lastInteraction: lastActivity?.description || undefined,
        };
      }

      if (!context) {
        throw { statusCode: 400, message: "leadId or leadContext is required" };
      }

      const message = await generateFollowUpMessage(
        context,
        body.actionType,
        body.customInstructions
      );

      return { message };
    }
  );
}
