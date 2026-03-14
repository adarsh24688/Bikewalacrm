import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function logActivity(params: {
  leadId: string;
  type: string;
  description: string;
  performedBy: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.activity.create({
    data: {
      leadId: params.leadId,
      type: params.type,
      description: params.description,
      performedBy: params.performedBy,
      metadata: (params.metadata as Prisma.InputJsonValue) || undefined,
    },
  });
}
