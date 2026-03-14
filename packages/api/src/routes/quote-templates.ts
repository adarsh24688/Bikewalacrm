import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["terms", "notes"]),
  content: z.string().min(1),
});

export async function quoteTemplateRoutes(app: FastifyInstance) {
  // GET /quote-templates?type=terms|notes
  app.get("/quote-templates", { preHandler: [requireAuth] }, async (request) => {
    const { type } = request.query as { type?: string };
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    const templates = await prisma.quoteTemplate.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
    });
    return templates;
  });

  // POST /quote-templates
  app.post("/quote-templates", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createTemplateSchema.parse(request.body);
    const template = await prisma.quoteTemplate.create({
      data: {
        name: body.name,
        type: body.type,
        content: body.content,
        createdBy: request.user!.id,
      },
    });
    return reply.code(201).send(template);
  });

  // DELETE /quote-templates/:id
  app.delete("/quote-templates/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.quoteTemplate.delete({ where: { id } });
    return reply.code(204).send();
  });
}
