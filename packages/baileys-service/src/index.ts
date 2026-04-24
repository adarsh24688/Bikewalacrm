import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { Server } from "socket.io";
import { createServer } from "http";
import * as path from "path";
import { handleIncomingMessage } from "./handlers/onMessage";
import { handleStatusUpdate } from "./handlers/onStatusUpdate";
import { sendText, sendMedia } from "./senders/sendText";
import { prisma } from "./lib/prisma";

const PORT = Number(process.env.PORT || process.env.BAILEYS_PORT) || 4001;
const WA_AUTH_DIR = process.env.WA_AUTH_DIR || "./wa-auth";
const BAILEYS_API_KEY = process.env.BAILEYS_API_KEY || "";

let sock: ReturnType<typeof makeWASocket> | null = null;
let io: Server;

// LID → phone number mapping (WhatsApp uses LID for incoming messages)
const lidToPhone = new Map<string, string>();

/** Resolve a JID to a clean phone number. Handles both @s.whatsapp.net and @lid formats. */
export function resolvePhoneFromJid(jid: string): string {
  if (!jid) return "";

  // Standard phone JID: 919764092911@s.whatsapp.net
  if (jid.endsWith("@s.whatsapp.net")) {
    return jid.replace("@s.whatsapp.net", "");
  }

  // LID JID: 172352910418153@lid → look up the phone mapping
  if (jid.endsWith("@lid")) {
    const phone = lidToPhone.get(jid);
    if (phone) return phone;
    // Fallback: strip @lid but mark it so we know it's unresolved
    return jid.replace("@lid", "");
  }

  // Group or other format — return as-is stripped of suffix
  return jid.split("@")[0];
}

async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(WA_AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    browser: ["Yash CRM", "Chrome", "1.0.0"],
  });

  // Connection updates
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("QR code generated");
      io.emit("wa:qr", { qr });

      await prisma.waSession.updateMany({
        data: { status: "connecting" },
      });
      io.emit("wa:status", { status: "connecting" });
    }

    if (connection === "open") {
      console.log("WhatsApp connected");
      const phoneNumber = sock?.user?.id?.split(":")[0] || "";

      await prisma.waSession.upsert({
        where: { phoneNumber },
        update: {
          status: "connected",
          connectedAt: new Date(),
          phoneNumber,
        },
        create: {
          phoneNumber,
          status: "connected",
          connectedAt: new Date(),
        },
      });

      io.emit("wa:status", { status: "connected", phoneNumber });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `Connection closed. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`
      );

      await prisma.waSession.updateMany({
        data: { status: "disconnected", disconnectedAt: new Date() },
      });
      io.emit("wa:status", { status: "disconnected" });

      if (shouldReconnect) {
        setTimeout(startSocket, 3000);
      }
    }
  });

  // Save credentials on update
  sock.ev.on("creds.update", saveCreds);

  // Build LID → phone mapping from contacts
  sock.ev.on("contacts.upsert", (contacts) => {
    for (const contact of contacts) {
      const phoneJid = (contact as any).id; // e.g. 919764092911@s.whatsapp.net
      const lid = (contact as any).lid;     // e.g. 172352910418153@lid
      if (lid && phoneJid && phoneJid.endsWith("@s.whatsapp.net")) {
        const phone = phoneJid.replace("@s.whatsapp.net", "");
        lidToPhone.set(lid, phone);
        // Also store without suffix for flexibility
        lidToPhone.set(lid.replace("@lid", "") + "@lid", phone);
        console.log(`LID mapping: ${lid} → ${phone}`);
      }
    }
  });

  sock.ev.on("contacts.update", (contacts) => {
    for (const contact of contacts) {
      const phoneJid = (contact as any).id;
      const lid = (contact as any).lid;
      if (lid && phoneJid && phoneJid.endsWith("@s.whatsapp.net")) {
        const phone = phoneJid.replace("@s.whatsapp.net", "");
        lidToPhone.set(lid, phone);
        lidToPhone.set(lid.replace("@lid", "") + "@lid", phone);
      }
    }
  });

  // Handle incoming messages
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      await handleIncomingMessage(msg, prisma, io);
    }
  });

  // Handle message status updates (sent/delivered/read)
  sock.ev.on("messages.update", async (updates) => {
    for (const update of updates) {
      await handleStatusUpdate(update, prisma, io);
    }
  });
}

// Export sock for senders
export function getSocket(): ReturnType<typeof makeWASocket> | null {
  return sock;
}

/** Normalize phone to digits-only with country code */
function normalizePhone(phone: string): string {
  const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || "91";
  let digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 10) digits = DEFAULT_COUNTRY_CODE + digits;
  return digits;
}

/** Log an outbound message to DB and upsert conversation */
async function logOutboundMessage(opts: {
  contactNumber: string;
  waMessageId: string;
  body: string | null;
  mediaType: string;
}) {
  try {
    // Auto-link to lead by last 10 digits
    const lead = await prisma.lead.findFirst({
      where: { phone: { contains: opts.contactNumber.slice(-10) } },
    });

    // Save outbound message
    const savedMessage = await prisma.waMessage.create({
      data: {
        waMessageId: opts.waMessageId,
        direction: "outbound",
        fromNumber: "self",
        toNumber: opts.contactNumber,
        body: opts.body,
        mediaType: opts.mediaType,
        status: "sent",
        leadId: lead?.id || null,
        timestamp: new Date(),
      },
    });

    // Upsert conversation
    const conversation = await prisma.waConversation.upsert({
      where: { contactNumber: opts.contactNumber },
      update: {
        lastMessageAt: new Date(),
        leadId: lead?.id || undefined,
      },
      create: {
        contactNumber: opts.contactNumber,
        contactName: lead?.name || opts.contactNumber,
        leadId: lead?.id || null,
        lastMessageAt: new Date(),
        unreadCount: 0,
      },
    });

    // Emit to frontend for live updates
    io.emit("inbox:new_message", {
      message: savedMessage,
      conversation,
    });
  } catch (err) {
    console.error("Failed to log outbound message:", err);
  }
}

async function main() {
  const httpServer = createServer();
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket.io client connected: ${socket.id}`);

    socket.on("wa:connect", () => {
      startSocket();
    });

    socket.on("wa:disconnect", async () => {
      if (sock) {
        await sock.logout();
        sock = null;
      }
    });
  });

  // HTTP API endpoints for inter-service communication
  httpServer.on("request", async (req, res) => {
    const cors = {
      "Access-Control-Allow-Origin": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      res.end();
      return;
    }

    if (req.url === "/health") {
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: sock ? "connected" : "disconnected" }));
      return;
    }

    if (req.method === "POST" && req.url === "/api/send/text") {
      if (BAILEYS_API_KEY) {
        const provided = req.headers["x-api-key"];
        if (typeof provided !== "string" || provided !== BAILEYS_API_KEY) {
          res.writeHead(401, { ...cors, "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
      }

      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { to, text } = JSON.parse(body);
          if (!to || !text) {
            res.writeHead(400, { ...cors, "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing 'to' or 'text'" }));
            return;
          }
          const result = await sendText(to, text);

          // Log outbound message and upsert conversation
          const contactNumber = normalizePhone(to);
          await logOutboundMessage({
            contactNumber,
            waMessageId: result?.key?.id || "",
            body: text,
            mediaType: "text",
          });

          res.writeHead(200, { ...cors, "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, messageId: result?.key?.id }));
        } catch (err: any) {
          res.writeHead(500, { ...cors, "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/send/document") {
      if (BAILEYS_API_KEY) {
        const provided = req.headers["x-api-key"];
        if (typeof provided !== "string" || provided !== BAILEYS_API_KEY) {
          res.writeHead(401, { ...cors, "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
      }

      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      req.on("end", async () => {
        try {
          const { to, document: docBase64, filename, caption, mimeType } = JSON.parse(
            Buffer.concat(chunks).toString()
          );
          if (!to || !docBase64 || !filename) {
            res.writeHead(400, { ...cors, "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing 'to', 'document', or 'filename'" }));
            return;
          }
          if (!sock) {
            res.writeHead(500, { ...cors, "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "WhatsApp not connected" }));
            return;
          }

          const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || "91";
          let digits = to.replace(/[^0-9]/g, "");
          if (digits.length === 10) digits = DEFAULT_COUNTRY_CODE + digits;
          const jid = `${digits}@s.whatsapp.net`;

          const buffer = Buffer.from(docBase64, "base64");
          console.log(`Sending document "${filename}" to ${jid} (${buffer.length} bytes)`);

          const result = await sock.sendMessage(jid, {
            document: buffer,
            mimetype: mimeType || "application/pdf",
            fileName: filename,
            caption,
          });

          // Log outbound document message and upsert conversation
          const contactNumber = normalizePhone(to);
          await logOutboundMessage({
            contactNumber,
            waMessageId: result?.key?.id || "",
            body: caption || filename,
            mediaType: "document",
          });

          res.writeHead(200, { ...cors, "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, messageId: result?.key?.id }));
        } catch (err: any) {
          res.writeHead(500, { ...cors, "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404, cors);
    res.end();
  });

  httpServer.listen(PORT, () => {
    console.log(`Baileys service running on port ${PORT}`);
  });

  // Auto-start if auth state exists
  try {
    const fs = await import("fs");
    if (fs.existsSync(path.join(WA_AUTH_DIR, "creds.json"))) {
      console.log("Found existing auth state, auto-connecting...");
      startSocket();
    } else {
      console.log("No auth state found. Waiting for connect command...");
    }
  } catch {
    console.log("Waiting for connect command...");
  }
}

main().catch(console.error);
