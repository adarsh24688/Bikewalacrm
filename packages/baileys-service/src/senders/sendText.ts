import { getSocket } from "../index";

const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || "91";

/**
 * Normalize a phone number to WhatsApp JID format.
 * Strips +, spaces, dashes. Adds country code if missing (10-digit Indian numbers).
 */
function toJid(phone: string): string {
  if (phone.includes("@")) return phone;

  // Strip everything except digits
  let digits = phone.replace(/[^0-9]/g, "");

  // If 10 digits, assume local Indian number — prepend country code
  if (digits.length === 10) {
    digits = DEFAULT_COUNTRY_CODE + digits;
  }

  return `${digits}@s.whatsapp.net`;
}

export async function sendText(to: string, text: string) {
  const sock = getSocket();
  if (!sock) throw new Error("WhatsApp not connected");

  const jid = toJid(to);
  console.log(`Sending text to ${jid}`);
  const result = await sock.sendMessage(jid, { text });
  return result;
}

export async function sendMedia(
  to: string,
  mediaPath: string,
  caption?: string,
  mimeType?: string
) {
  const sock = getSocket();
  if (!sock) throw new Error("WhatsApp not connected");

  const jid = toJid(to);
  const fs = await import("fs");
  const buffer = fs.readFileSync(mediaPath);

  if (mimeType?.startsWith("image/")) {
    return sock.sendMessage(jid, {
      image: buffer,
      caption,
      mimetype: mimeType,
    });
  }

  // Default to document
  return sock.sendMessage(jid, {
    document: buffer,
    caption,
    mimetype: mimeType || "application/pdf",
    fileName: mediaPath.split("/").pop() || "document",
  });
}
