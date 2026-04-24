import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, scopeToUser } from "../middleware/auth";
import { logActivity } from "../services/activity";
import { evaluateRulesForEvent } from "../services/auto-followup";
import { z } from "zod";

const createLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string()
    .transform((val) => val.replace(/^(\+91|91|0)/, "").replace(/[\s-]/g, ""))
    .refine((val) => /^[6-9]\d{9}$/.test(val), {
      message: "Must be a valid 10-digit Indian mobile number",
    }),
  email: z.string().email().optional().or(z.literal("")),
  source: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: z
    .enum(["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"])
    .default("new"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  productInterest: z.array(z.string()).default([]),
  notes: z.string().optional(),
  nextFollowUp: z.string().datetime().optional(),
});

export async function leadRoutes(app: FastifyInstance) {
  // GET /leads — paginated, filterable
  app.get("/leads", { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      page = "1",
      pageSize = "20",
      status,
      source,
      assignedTo,
      branchId,
      search,
      from,
      to,
    } = request.query as Record<string, string | undefined>;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const scopedUser = scopeToUser(request);

    const where: Record<string, unknown> = {};
    if (scopedUser) where.assignedTo = scopedUser;
    if (status) where.status = status;
    if (source) where.source = source;
    if (assignedTo && !scopedUser) where.assignedTo = assignedTo;
    if (branchId) where.branchId = branchId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      prisma.lead.findMany({
        where: where as any,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { branch: true },
      }),
      prisma.lead.count({ where: where as any }),
    ]);

    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  });

  // POST /leads
  app.post("/leads", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createLeadSchema.parse(request.body);

    const lead = await prisma.lead.create({
      data: {
        ...body,
        nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : undefined,
        createdBy: request.user!.id,
      },
    });

    await logActivity({
      leadId: lead.id,
      type: "lead_created",
      description: `Lead created by ${request.user!.email}`,
      performedBy: request.user!.id,
    });

    evaluateRulesForEvent({ leadId: lead.id, eventType: "lead_created" }).catch(
      (err) => console.error("Auto follow-up rule evaluation failed:", err)
    );

    // Send WhatsApp welcome message (fire-and-forget)
    if (lead.phone) {
      const baileysUrl =
        process.env.BAILEYS_SERVICE_URL ||
        (process.env.NODE_ENV === "development" ? "http://localhost:4001" : "");
      if (!baileysUrl) return reply.code(201).send(lead);

      const baileysHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(process.env.BAILEYS_API_KEY
          ? { "x-api-key": process.env.BAILEYS_API_KEY }
          : {}),
      };
      const firstName = lead.name.split(" ")[0];
      const welcome = [
        `Hello ${firstName}! 👋`,
        ``,
        `Thank you for your interest in *Yash Honda*. We're delighted to connect with you!`,
        ``,
        `Our team is here to help you find the perfect two-wheeler. Whether you need details on models, pricing, test rides, or financing — just reply to this message and we'll get right back to you.`,
        ``,
        `We look forward to serving you!`,
        ``,
        `_Warm regards,_`,
        `_Team Yash Honda_ 🏍️`,
      ].join("\n");

      fetch(`${baileysUrl}/api/send/text`, {
        method: "POST",
        headers: baileysHeaders,
        body: JSON.stringify({ to: lead.phone, text: welcome }),
      }).catch((err) => console.error("Welcome WhatsApp failed:", err.message));
    }

    return reply.code(201).send(lead);
  });

  // GET /leads/:id
  app.get("/leads/:id", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        branch: true,
        contacts: true,
        quotations: { orderBy: { createdAt: "desc" } },
        followUps: { orderBy: { scheduledAt: "desc" } },
      },
    });
    if (!lead) throw { statusCode: 404, message: "Lead not found" };
    return lead;
  });

  // PATCH /leads/:id
  app.patch("/leads/:id", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = createLeadSchema.partial().parse(request.body);

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) throw { statusCode: 404, message: "Lead not found" };

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...body,
        nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : undefined,
      },
    });

    // Log status change
    if (body.status && body.status !== existing.status) {
      await logActivity({
        leadId: id,
        type: "status_changed",
        description: `Status changed from ${existing.status} to ${body.status}`,
        performedBy: request.user!.id,
        metadata: { from: existing.status, to: body.status },
      });

      evaluateRulesForEvent({
        leadId: id,
        eventType: "status_changed",
        oldStatus: existing.status,
        newStatus: body.status,
      }).catch((err) =>
        console.error("Auto follow-up rule evaluation failed:", err)
      );
    }

    return lead;
  });

  // DELETE /leads/:id
  app.delete(
    "/leads/:id",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await prisma.lead.delete({ where: { id } });
      return reply.code(204).send();
    }
  );

  // POST /leads/:id/assign
  app.post(
    "/leads/:id/assign",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string };

      const lead = await prisma.lead.update({
        where: { id },
        data: { assignedTo: userId },
      });

      const assignee = await prisma.allowedUser.findUnique({ where: { id: userId } });
      await logActivity({
        leadId: id,
        type: "lead_assigned",
        description: `Lead assigned to ${assignee?.email || userId}`,
        performedBy: request.user!.id,
        metadata: { assignedTo: userId },
      });

      return lead;
    }
  );

  // GET /leads/:id/activities
  app.get("/leads/:id/activities", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };
    const { page = "1", pageSize = "50" } = request.query as Record<string, string>;

    const activities = await prisma.activity.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
    });

    // Resolve performedBy UUIDs to names
    const userIds = [...new Set(activities.map((a) => a.performedBy))];
    const users = await prisma.allowedUser.findMany({
      where: { id: { in: userIds } },
      include: { profile: true },
    });
    const nameMap = Object.fromEntries(
      users.map((u) => [u.id, u.profile?.name || u.email])
    );

    return activities.map((a) => ({
      ...a,
      performedByName: nameMap[a.performedBy] || a.performedBy,
    }));
  });

  // POST /leads/:id/notes
  app.post("/leads/:id/notes", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { text } = request.body as { text: string };

    if (!text || !text.trim()) {
      throw { statusCode: 400, message: "Note text is required" };
    }

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw { statusCode: 404, message: "Lead not found" };

    const activity = await logActivity({
      leadId: id,
      type: "note",
      description: text.trim(),
      performedBy: request.user!.id,
    });

    // Resolve performer name
    const user = await prisma.allowedUser.findUnique({
      where: { id: request.user!.id },
      include: { profile: true },
    });

    return reply.code(201).send({
      ...activity,
      performedByName: user?.profile?.name || user?.email || request.user!.id,
    });
  });
}
