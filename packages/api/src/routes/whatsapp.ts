import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export async function whatsappRoutes(app: FastifyInstance) {
  // GET /whatsapp/status
  app.get("/whatsapp/status", { preHandler: [requireAuth] }, async () => {
    const session = await prisma.waSession.findFirst({
      orderBy: { createdAt: "desc" },
    });

    return {
      status: session?.status || "disconnected",
      phoneNumber: session?.phoneNumber || null,
      connectedAt: session?.connectedAt || null,
    };
  });

  // POST /whatsapp/connect — trigger QR generation
  app.post(
    "/whatsapp/connect",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (_request, reply) => {
      // TODO: Trigger Baileys service to start connection and generate QR
      // This will be implemented when the Baileys service is fully wired up

      let session = await prisma.waSession.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (!session) {
        session = await prisma.waSession.create({
          data: {
            phoneNumber: "",
            status: "connecting",
          },
        });
      } else {
        session = await prisma.waSession.update({
          where: { id: session.id },
          data: { status: "connecting" },
        });
      }

      return reply.code(200).send({ status: "connecting", sessionId: session.id });
    }
  );

  // POST /whatsapp/disconnect
  app.post(
    "/whatsapp/disconnect",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async () => {
      const session = await prisma.waSession.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (session) {
        await prisma.waSession.update({
          where: { id: session.id },
          data: { status: "disconnected", disconnectedAt: new Date() },
        });
      }

      // TODO: Tell Baileys service to close socket

      return { status: "disconnected" };
    }
  );
}
