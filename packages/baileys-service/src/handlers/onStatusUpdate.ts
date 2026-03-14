import { WAMessageUpdate } from "@whiskeysockets/baileys";
import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";

const statusMap: Record<number, string> = {
  0: "pending",
  1: "sent",
  2: "delivered",
  3: "read",
  4: "read",
};

export async function handleStatusUpdate(
  update: WAMessageUpdate,
  prisma: PrismaClient,
  io: Server
) {
  if (!update.key.id || !update.update?.status) return;

  const newStatus = statusMap[update.update.status] || "sent";

  const message = await prisma.waMessage.findFirst({
    where: { waMessageId: update.key.id },
  });

  if (!message) return;

  await prisma.waMessage.update({
    where: { id: message.id },
    data: { status: newStatus as any },
  });

  io.emit("inbox:status_update", {
    messageId: message.id,
    status: newStatus,
  });
}
