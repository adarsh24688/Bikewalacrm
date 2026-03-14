import { proto, extractMessageContent, getContentType } from "@whiskeysockets/baileys";
import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";
import { resolvePhoneFromJid } from "../index";

export async function handleIncomingMessage(
  msg: proto.IWebMessageInfo,
  prisma: PrismaClient,
  io: Server
) {
  if (!msg.key.remoteJid) return;

  let fromNumber = resolvePhoneFromJid(msg.key.remoteJid);
  const rawJid = msg.key.remoteJid;
  const waMessageId = msg.key.id || "";
  const timestamp = msg.messageTimestamp
    ? new Date(Number(msg.messageTimestamp) * 1000)
    : new Date();

  // Extract the actual message content — unwraps ephemeral, viewOnce, etc.
  const content = extractMessageContent(msg.message);
  const contentType = getContentType(content);

  let body: string | null = null;
  let mediaType = "text";
  let mediaUrl: string | null = null;

  if (content?.conversation) {
    body = content.conversation;
  } else if (content?.extendedTextMessage?.text) {
    body = content.extendedTextMessage.text;
  } else if (content?.imageMessage) {
    body = content.imageMessage.caption || null;
    mediaType = "image";
  } else if (content?.documentMessage) {
    body = content.documentMessage.fileName || null;
    mediaType = "document";
  } else if (content?.audioMessage) {
    mediaType = "audio";
  } else if (content?.videoMessage) {
    body = content.videoMessage.caption || null;
    mediaType = "video";
  } else if (content?.stickerMessage) {
    mediaType = "sticker";
  } else if (content?.contactMessage) {
    body = content.contactMessage.displayName || null;
    mediaType = "contact";
  } else if (content?.locationMessage) {
    body = content.locationMessage.name || "Location shared";
    mediaType = "location";
  } else if (content?.buttonsResponseMessage) {
    body = content.buttonsResponseMessage.selectedDisplayText || null;
  } else if (content?.listResponseMessage) {
    body = content.listResponseMessage.title || null;
  } else if (content?.templateButtonReplyMessage) {
    body = content.templateButtonReplyMessage.selectedDisplayText || null;
  }

  console.log(`Message content type: ${contentType}, body extracted: ${!!body}`);

  // Check for duplicate messages
  const existing = await prisma.waMessage.findFirst({
    where: { waMessageId },
  });
  if (existing) return;

  // If LID couldn't be resolved from the in-memory map,
  // try to find an existing conversation by pushName or by matching the lead
  const isUnresolvedLid = rawJid.endsWith("@lid") && fromNumber === rawJid.replace("@lid", "");
  if (isUnresolvedLid && msg.pushName) {
    // Try finding a conversation that matches this person's name and was recently messaged
    const existingConv = await prisma.waConversation.findFirst({
      where: { contactName: msg.pushName },
      orderBy: { lastMessageAt: "desc" },
    });
    if (existingConv) {
      fromNumber = existingConv.contactNumber;
      console.log(`LID resolved via conversation name: ${rawJid} → ${fromNumber}`);
    } else {
      // Try matching by lead name
      const lead = await prisma.lead.findFirst({
        where: { name: { equals: msg.pushName, mode: "insensitive" } },
      });
      if (lead?.phone) {
        const DEFAULT_CC = process.env.DEFAULT_COUNTRY_CODE || "91";
        fromNumber = lead.phone.length === 10 ? DEFAULT_CC + lead.phone : lead.phone;
        console.log(`LID resolved via lead name: ${rawJid} → ${fromNumber}`);
      }
    }
  }

  // Auto-link to lead by phone number
  const lead = await prisma.lead.findFirst({
    where: { phone: { contains: fromNumber.slice(-10) } },
  });

  // Save message
  const savedMessage = await prisma.waMessage.create({
    data: {
      waMessageId,
      direction: "inbound",
      fromNumber,
      toNumber: "self",
      body,
      mediaType,
      mediaUrl,
      status: "delivered",
      leadId: lead?.id || null,
      timestamp,
    },
  });

  // Upsert conversation
  const contactName = msg.pushName || fromNumber;

  const conversation = await prisma.waConversation.upsert({
    where: { contactNumber: fromNumber },
    update: {
      contactName,
      lastMessageAt: timestamp,
      unreadCount: { increment: 1 },
      leadId: lead?.id || undefined,
    },
    create: {
      contactNumber: fromNumber,
      contactName,
      leadId: lead?.id || null,
      lastMessageAt: timestamp,
      unreadCount: 1,
    },
  });

  // Emit to frontend
  io.emit("inbox:new_message", {
    message: savedMessage,
    conversation,
  });

  console.log(`Inbound message from ${fromNumber}: ${body?.substring(0, 50) || "[media]"}`);
}
