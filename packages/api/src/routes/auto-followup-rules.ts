import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.enum(["lead_created", "status_changed"]),
  conditions: z.record(z.unknown()).optional(),
  fromStatus: z.string().optional(),
  toStatus: z.string().optional(),
  delayHours: z.number().int().min(0).default(0),
  actionType: z.enum(["create_followup", "send_whatsapp", "send_email"]),
  messageTemplate: z.string().optional(),
  followUpType: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function autoFollowUpRuleRoutes(app: FastifyInstance) {
  // GET /automation/rules
  app.get(
    "/automation/rules",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async () => {
      const rules = await prisma.followUpRule.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { logs: true } } },
      });
      return rules.map((r) => ({
        ...r,
        executionCount: r._count.logs,
        _count: undefined,
      }));
    }
  );

  // GET /automation/rules/:id
  app.get(
    "/automation/rules/:id",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const rule = await prisma.followUpRule.findUnique({
        where: { id },
        include: {
          logs: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { lead: { select: { id: true, name: true, phone: true } } },
          },
          _count: { select: { logs: true } },
        },
      });
      if (!rule) throw { statusCode: 404, message: "Rule not found" };
      return { ...rule, executionCount: rule._count.logs, _count: undefined };
    }
  );

  // POST /automation/rules
  app.post(
    "/automation/rules",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request, reply) => {
      const body = createRuleSchema.parse(request.body);
      const rule = await prisma.followUpRule.create({
        data: {
          ...body,
          conditions: body.conditions || undefined,
          createdBy: request.user!.id,
        } as any,
      });
      return reply.code(201).send(rule);
    }
  );

  // PATCH /automation/rules/:id
  app.patch(
    "/automation/rules/:id",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = createRuleSchema.partial().parse(request.body);
      const rule = await prisma.followUpRule.update({
        where: { id },
        data: body as any,
      });
      return rule;
    }
  );

  // DELETE /automation/rules/:id
  app.delete(
    "/automation/rules/:id",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await prisma.followUpRule.delete({ where: { id } });
      return reply.code(204).send();
    }
  );

  // PATCH /automation/rules/:id/toggle
  app.patch(
    "/automation/rules/:id/toggle",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const rule = await prisma.followUpRule.findUnique({ where: { id } });
      if (!rule) throw { statusCode: 404, message: "Rule not found" };
      return prisma.followUpRule.update({
        where: { id },
        data: { isActive: !rule.isActive },
      });
    }
  );
}
