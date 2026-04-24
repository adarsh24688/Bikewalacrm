import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Require an authenticated user on the request.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

/**
 * Require the authenticated user to have one of the specified roles.
 */
export function requireRole(...roles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: "Forbidden" });
    }
  };
}

/**
 * For sales_rep role, scope queries to only their assigned data.
 * Returns the user ID filter if the user is a sales_rep, otherwise null.
 */
export function scopeToUser(request: FastifyRequest): string | null {
  if (request.user?.role === "sales_rep") {
    return request.user.id;
  }
  return null;
}
