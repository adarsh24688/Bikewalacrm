import { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: string;
      branchId: string | null;
    };
  }
}

async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("user", undefined);

  app.addHook("onRequest", async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return;

    const token = authHeader.slice(7);
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return;

    try {
      const decoded = jwt.verify(token, secret) as {
        email?: string;
        sub?: string;
      };
      const email = decoded.email || decoded.sub;
      if (!email) return;

      // Credentials admin — hardcoded, no DB lookup needed
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && email === adminEmail) {
        request.user = {
          id: "admin",
          email: adminEmail,
          role: "super_admin",
          branchId: null,
        };
        return;
      }

      const allowedUser = await prisma.allowedUser.findUnique({
        where: { email, isActive: true },
      });

      if (allowedUser) {
        request.user = {
          id: allowedUser.id,
          email: allowedUser.email,
          role: allowedUser.role,
          branchId: allowedUser.branchId,
        };
      }
    } catch {
      // Invalid token — request.user stays undefined
    }
  });
}

export default fp(authPlugin, { name: "auth" });
