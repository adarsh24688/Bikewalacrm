import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, scopeToUser } from "../middleware/auth";
import { logActivity } from "../services/activity";

export async function inboxRoutes(app: FastifyInstance) {
  // GET /inbox/conversations
  app.get("/inbox/conversations", { preHandler: [requireAuth] }, async (request) => {
    const { filter, search, page = "1", pageSize = "50" } = request.query as Record<
      string,
      string | undefined
    >;
    const scopedUser = scopeToUser(request);

    const where: Record<string, unknown> = {};
    if (scopedUser) where.assignedTo = scopedUser;

    if (filter === "unread") where.unreadCount = { gt: 0 };
    if (filter === "linked") where.leadId = { not: null };
    if (filter === "unassigned") where.assignedTo = null;

    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: "insensitive" } },
        { contactNumber: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.waConversation.findMany({
        where: where as any,
        orderBy: { lastMessageAt: "desc" },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        include: {
          lead: { select: { id: true, name: true, status: true } },
        },
      }),
      prisma.waConversation.count({ where: where as any }),
    ]);

    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  });

  // GET /inbox/conversations/:id/messages
  app.get(
    "/inbox/conversations/:id/messages",
    { preHandler: [requireAuth] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { page = "1", pageSize = "50" } = request.query as Record<string, string>;

      const conversation = await prisma.waConversation.findUnique({ where: { id } });
      if (!conversation) throw { statusCode: 404, message: "Conversation not found" };

      // Reset unread count when messages are loaded
      await prisma.waConversation.update({
        where: { id },
        data: { unreadCount: 0 },
      });

      const messages = await prisma.waMessage.findMany({
        where: {
          OR: [
            { fromNumber: conversation.contactNumber },
            { toNumber: conversation.contactNumber },
          ],
        },
        orderBy: { timestamp: "asc" },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      });

      return messages;
    }
  );

  // POST /inbox/conversations/:id/send
  app.post(
    "/inbox/conversations/:id/send",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { body, mediaType, mediaUrl } = request.body as {
        body?: string;
        mediaType?: string;
        mediaUrl?: string;
      };

      const conversation = await prisma.waConversation.findUnique({ where: { id } });
      if (!conversation) throw { statusCode: 404, message: "Conversation not found" };

      const message = await prisma.waMessage.create({
        data: {
          direction: "outbound",
          fromNumber: "self",
          toNumber: conversation.contactNumber,
          body,
          mediaType: mediaType || "text",
          mediaUrl,
          status: "pending",
          leadId: conversation.leadId,
          sentBy: request.user!.id,
        },
      });

      // Update conversation
      await prisma.waConversation.update({
        where: { id },
        data: { lastMessageAt: new Date() },
      });

      // TODO: Actually send via Baileys service when integrated
      // For now, mark as sent
      await prisma.waMessage.update({
        where: { id: message.id },
        data: { status: "sent" },
      });

      return reply.code(201).send(message);
    }
  );

  // GET /inbox/by-lead/:leadId — get conversation + messages for a lead
  app.get(
    "/inbox/by-lead/:leadId",
    { preHandler: [requireAuth] },
    async (request) => {
      const { leadId } = request.params as { leadId: string };

      const conversation = await prisma.waConversation.findFirst({
        where: { leadId },
        orderBy: { lastMessageAt: "desc" },
      });

      if (!conversation) {
        return { conversation: null, messages: [] };
      }

      const messages = await prisma.waMessage.findMany({
        where: {
          OR: [
            { fromNumber: conversation.contactNumber },
            { toNumber: conversation.contactNumber },
          ],
        },
        orderBy: { timestamp: "asc" },
        take: 100,
      });

      return { conversation, messages };
    }
  );

  // POST /inbox/conversations/:id/assign
  app.post(
    "/inbox/conversations/:id/assign",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string };

      const conversation = await prisma.waConversation.update({
        where: { id },
        data: { assignedTo: userId },
      });

      if (conversation.leadId) {
        const assignee = await prisma.allowedUser.findUnique({ where: { id: userId } });
        await logActivity({
          leadId: conversation.leadId,
          type: "conversation_assigned",
          description: `WhatsApp conversation assigned to ${assignee?.email || userId}`,
          performedBy: request.user!.id,
        });
      }

      return conversation;
    }
  );

  // PATCH /inbox/conversations/:id/link
  app.patch(
    "/inbox/conversations/:id/link",
    { preHandler: [requireAuth] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { leadId } = request.body as { leadId: string };

      return prisma.waConversation.update({
        where: { id },
        data: { leadId },
      });
    }
  );

  // POST /inbox/conversations/:id/archive
  app.post(
    "/inbox/conversations/:id/archive",
    { preHandler: [requireAuth] },
    async (request) => {
      const { id } = request.params as { id: string };
      return prisma.waConversation.update({
        where: { id },
        data: { isArchived: true },
      });
    }
  );
}
