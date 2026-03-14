import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["super_admin", "manager", "sales_rep", "frontdesk"]),
  branchId: z.string().uuid().optional(),
});

export async function userRoutes(app: FastifyInstance) {
  // GET /team-members — lightweight list for resolving assignedTo names
  app.get("/team-members", { preHandler: [requireAuth] }, async () => {
    const users = await prisma.allowedUser.findMany({
      where: { isActive: true },
      select: { id: true, email: true, role: true, profile: { select: { name: true } } },
      orderBy: { email: "asc" },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.profile?.name || u.email.split("@")[0],
      email: u.email,
      role: u.role,
    }));
  });

  // GET /users — list all allowed users
  app.get(
    "/users",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async () => {
      const users = await prisma.allowedUser.findMany({
        include: { profile: true, branch: true },
        orderBy: { invitedAt: "desc" },
      });
      return users;
    }
  );

  // POST /users — invite a new user
  app.post(
    "/users",
    { preHandler: [requireAuth, requireRole("super_admin")] },
    async (request, reply) => {
      const body = inviteUserSchema.parse(request.body);

      const existing = await prisma.allowedUser.findUnique({
        where: { email: body.email },
      });
      if (existing) {
        throw { statusCode: 409, message: "User with this email already exists" };
      }

      const user = await prisma.allowedUser.create({
        data: {
          email: body.email,
          role: body.role as any,
          branchId: body.branchId,
          invitedBy: request.user!.id,
        },
      });

      // Send invite email if Resend is configured
      if (process.env.RESEND_API_KEY) {
        try {
          const { sendInviteEmail } = await import("../services/email");
          await sendInviteEmail(body.email, body.role);
        } catch {
          // Email failure is non-blocking
        }
      }

      return reply.code(201).send(user);
    }
  );

  // PATCH /users/:id — update role or deactivate
  app.patch(
    "/users/:id",
    { preHandler: [requireAuth, requireRole("super_admin")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        role?: string;
        branchId?: string;
        isActive?: boolean;
      };

      // Prevent self-deactivation
      if (id === request.user!.id && body.isActive === false) {
        throw { statusCode: 400, message: "Cannot deactivate your own account" };
      }

      const user = await prisma.allowedUser.update({
        where: { id },
        data: {
          ...(body.role && { role: body.role as any }),
          ...(body.branchId !== undefined && { branchId: body.branchId }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });

      return user;
    }
  );

  // DELETE /users/:id — revoke access
  app.delete(
    "/users/:id",
    { preHandler: [requireAuth, requireRole("super_admin")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      if (id === request.user!.id) {
        throw { statusCode: 400, message: "Cannot delete your own account" };
      }

      await prisma.allowedUser.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.code(204).send();
    }
  );
}
