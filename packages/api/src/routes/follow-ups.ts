import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth, scopeToUser } from "../middleware/auth";
import { logActivity } from "../services/activity";
import { z } from "zod";

const createFollowUpSchema = z.object({
  leadId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  type: z.enum(["call", "whatsapp", "email", "visit", "meeting"]),
  notes: z.string().optional(),
});

export async function followUpRoutes(app: FastifyInstance) {
  // GET /leads/:id/follow-ups — get follow-ups for a specific lead
  app.get("/leads/:id/follow-ups", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };
    const followUps = await prisma.followUp.findMany({
      where: { leadId: id },
      orderBy: { scheduledAt: "desc" },
      include: { lead: { select: { id: true, name: true, phone: true, status: true, assignedTo: true } } },
    });
    return followUps;
  });

  // POST /leads/:id/follow-ups — create follow-up for a specific lead
  app.post("/leads/:id/follow-ups", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { scheduledAt: string; type: string; notes?: string };

    const followUp = await prisma.followUp.create({
      data: {
        leadId: id,
        scheduledAt: new Date(body.scheduledAt),
        type: body.type as any,
        notes: body.notes,
        createdBy: request.user!.id,
      },
    });

    await prisma.lead.update({
      where: { id },
      data: { nextFollowUp: new Date(body.scheduledAt) },
    });

    await logActivity({
      leadId: id,
      type: "followup_scheduled",
      description: `Follow-up (${body.type}) scheduled for ${new Date(body.scheduledAt).toLocaleDateString()}`,
      performedBy: request.user!.id,
    });

    return reply.code(201).send(followUp);
  });

  // GET /follow-ups — filter by status, date range
  app.get("/follow-ups", { preHandler: [requireAuth] }, async (request) => {
    const { status, from, to, view } = request.query as Record<string, string | undefined>;
    const scopedUser = scopeToUser(request);

    const where: Record<string, unknown> = {};
    if (scopedUser) {
      where.lead = { assignedTo: scopedUser };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    if (view === "today") {
      where.scheduledAt = { gte: todayStart, lt: todayEnd };
      where.status = "scheduled";
    } else if (view === "upcoming") {
      where.scheduledAt = { gte: todayEnd };
      where.status = "scheduled";
    } else if (view === "missed") {
      where.scheduledAt = { lt: todayStart };
      where.status = "scheduled";
    } else {
      if (status) where.status = status;
      if (from || to) {
        where.scheduledAt = {};
        if (from) (where.scheduledAt as Record<string, unknown>).gte = new Date(from);
        if (to) (where.scheduledAt as Record<string, unknown>).lte = new Date(to);
      }
    }

    const followUps = await prisma.followUp.findMany({
      where: where as any,
      orderBy: { scheduledAt: "asc" },
      include: { lead: { select: { id: true, name: true, phone: true, status: true, assignedTo: true } } },
    });

    return followUps;
  });

  // GET /follow-ups/counts — get counts for today, upcoming, missed
  app.get("/follow-ups/counts", { preHandler: [requireAuth] }, async (request) => {
    const scopedUser = scopeToUser(request);
    const leadFilter = scopedUser ? { lead: { assignedTo: scopedUser } } : {};

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [today, upcoming, missed] = await Promise.all([
      prisma.followUp.count({
        where: {
          ...leadFilter,
          scheduledAt: { gte: todayStart, lt: todayEnd },
          status: "scheduled",
        } as any,
      }),
      prisma.followUp.count({
        where: {
          ...leadFilter,
          scheduledAt: { gte: todayEnd },
          status: "scheduled",
        } as any,
      }),
      prisma.followUp.count({
        where: {
          ...leadFilter,
          scheduledAt: { lt: todayStart },
          status: "scheduled",
        } as any,
      }),
    ]);

    return { today, upcoming, missed };
  });

  // POST /follow-ups
  app.post("/follow-ups", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createFollowUpSchema.parse(request.body);

    const followUp = await prisma.followUp.create({
      data: {
        leadId: body.leadId,
        scheduledAt: new Date(body.scheduledAt),
        type: body.type,
        notes: body.notes,
        createdBy: request.user!.id,
      },
    });

    // Update lead's next follow-up
    await prisma.lead.update({
      where: { id: body.leadId },
      data: { nextFollowUp: new Date(body.scheduledAt) },
    });

    await logActivity({
      leadId: body.leadId,
      type: "followup_scheduled",
      description: `Follow-up (${body.type}) scheduled for ${new Date(body.scheduledAt).toLocaleDateString()}`,
      performedBy: request.user!.id,
    });

    return reply.code(201).send(followUp);
  });

  // PATCH /follow-ups/:id
  app.patch("/follow-ups/:id", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      scheduledAt?: string;
      status?: string;
      notes?: string;
      completionNotes?: string;
    };

    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) throw { statusCode: 404, message: "Follow-up not found" };

    const data: Record<string, unknown> = {};
    if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt);
    if (body.status) data.status = body.status;
    if (body.notes) data.notes = body.notes;
    if (body.status === "completed") {
      data.completedAt = new Date();
      if (body.completionNotes) data.notes = body.completionNotes;
    }

    const followUp = await prisma.followUp.update({
      where: { id },
      data: data as any,
    });

    if (body.status === "completed") {
      const description = body.completionNotes
        ? `Follow-up (${existing.type}) completed — ${body.completionNotes}`
        : `Follow-up (${existing.type}) marked as completed`;
      await logActivity({
        leadId: existing.leadId,
        type: "followup_completed",
        description,
        performedBy: request.user!.id,
        metadata: body.completionNotes ? { completionNotes: body.completionNotes } : undefined,
      });
    }

    return followUp;
  });

  // DELETE /follow-ups/:id
  app.delete("/follow-ups/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.followUp.delete({ where: { id } });
    return reply.code(204).send();
  });
}
