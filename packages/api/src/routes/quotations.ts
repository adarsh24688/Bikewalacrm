import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth, scopeToUser } from "../middleware/auth";
import { logActivity } from "../services/activity";
import { generateQuotationPdf } from "../services/pdf";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

const lineItemSchema = z.object({
  productId: z.string().optional(),
  productName: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  selectedColor: z.string().optional(),
  selectedColorHex: z.string().optional(),
  selectedTrim: z.string().optional(),
  productImage: z.string().optional(),
  specifications: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  features: z.array(z.object({ title: z.string(), description: z.string().optional(), imageUrl: z.string().optional() })).optional(),
});

const createQuotationSchema = z.object({
  leadId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(18),
  validUntil: z.string().datetime().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.quotation.count({
    where: {
      quoteNumber: { startsWith: `YC-${year}` },
    },
  });
  return `YC-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function quotationRoutes(app: FastifyInstance) {
  // GET /quotations
  app.get("/quotations", { preHandler: [requireAuth] }, async (request) => {
    const { leadId, status, search, page = "1", pageSize = "20" } = request.query as Record<
      string,
      string | undefined
    >;
    const scopedUser = scopeToUser(request);

    const where: Record<string, unknown> = {};
    if (scopedUser) where.lead = { assignedTo: scopedUser };
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { quoteNumber: { contains: search, mode: "insensitive" } },
        { lead: { name: { contains: search, mode: "insensitive" } } },
        { lead: { phone: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.quotation.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        include: { lead: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.quotation.count({ where: where as any }),
    ]);

    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  });

  // POST /quotations
  app.post("/quotations", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createQuotationSchema.parse(request.body);

    const subtotal = body.lineItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = body.discount;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * body.taxRate) / 100;
    const total = taxableAmount + taxAmount;

    const quoteNumber = await generateQuoteNumber();

    const quotation = await prisma.quotation.create({
      data: {
        quoteNumber,
        leadId: body.leadId,
        contactId: body.contactId,
        createdBy: request.user!.id,
        lineItems: body.lineItems,
        subtotal: new Decimal(subtotal),
        discount: new Decimal(discountAmount),
        taxRate: new Decimal(body.taxRate),
        taxAmount: new Decimal(taxAmount),
        total: new Decimal(total),
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
        terms: body.terms,
        notes: body.notes,
      },
    });

    await logActivity({
      leadId: body.leadId,
      type: "quotation_created",
      description: `Quotation ${quoteNumber} created (Total: ${total.toFixed(2)})`,
      performedBy: request.user!.id,
    });

    return reply.code(201).send(quotation);
  });

  // GET /quotations/:id
  app.get("/quotations/:id", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true } },
        contact: true,
      },
    });
    if (!quotation) throw { statusCode: 404, message: "Quotation not found" };
    return quotation;
  });

  // PATCH /quotations/:id
  app.patch("/quotations/:id", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    if (body.lineItems) {
      const items = body.lineItems as Array<{ total: number }>;
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const discount = Number(body.discount || 0);
      const taxRate = Number(body.taxRate || 18);
      const taxableAmount = subtotal - discount;
      const taxAmount = (taxableAmount * taxRate) / 100;
      const total = taxableAmount + taxAmount;

      body.subtotal = new Decimal(subtotal);
      body.discount = new Decimal(discount);
      body.taxRate = new Decimal(taxRate);
      body.taxAmount = new Decimal(taxAmount);
      body.total = new Decimal(total);
    }

    return prisma.quotation.update({ where: { id }, data: body as any });
  });

  // POST /quotations/:id/send
  app.post("/quotations/:id/send", { preHandler: [requireAuth], bodyLimit: 10 * 1024 * 1024 }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { channel, pdfBase64 } = request.body as {
      channel: "whatsapp" | "email" | "pdf";
      pdfBase64?: string;
    };

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { lead: true },
    });
    if (!quotation) throw { statusCode: 404, message: "Quotation not found" };

    if (channel === "whatsapp") {
      const phone = quotation.lead?.phone;
      if (!phone) {
        return reply.code(400).send({ error: "Lead has no phone number" });
      }

      const baileysUrl =
        process.env.BAILEYS_SERVICE_URL ||
        (process.env.NODE_ENV === "development" ? "http://localhost:4001" : "");
      if (!baileysUrl) {
        return reply
          .code(500)
          .send({ error: "BAILEYS_SERVICE_URL is not configured" });
      }

      const baileysHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(process.env.BAILEYS_API_KEY
          ? { "x-api-key": process.env.BAILEYS_API_KEY }
          : {}),
      };

      // Use frontend-captured PDF if provided, otherwise generate server-side
      let pdfB64: string;
      if (pdfBase64) {
        pdfB64 = pdfBase64;
      } else {
        const lineItems = (quotation.lineItems as Array<{
          productName: string;
          quantity: number;
          unitPrice: number;
          total: number;
          selectedColor?: string;
          selectedTrim?: string;
        }>) || [];
        const pdfBuffer = await generateQuotationPdf({
          quoteNumber: quotation.quoteNumber,
          createdAt: quotation.createdAt.toISOString(),
          validUntil: quotation.validUntil?.toISOString(),
          customerName: quotation.lead?.name || "Customer",
          customerPhone: phone,
          customerEmail: quotation.lead?.email,
          lineItems,
          subtotal: Number(quotation.subtotal),
          discount: Number(quotation.discount),
          taxRate: Number(quotation.taxRate),
          taxAmount: Number(quotation.taxAmount),
          total: Number(quotation.total),
          terms: quotation.terms,
          notes: quotation.notes,
        });
        pdfB64 = pdfBuffer.toString("base64");
      }

      // Send PDF document via WhatsApp
      const caption = `Quotation ${quotation.quoteNumber} — Total: ₹${Number(quotation.total).toLocaleString("en-IN")}`;
      const docRes = await fetch(`${baileysUrl}/api/send/document`, {
        method: "POST",
        headers: baileysHeaders,
        body: JSON.stringify({
          to: phone,
          document: pdfB64,
          filename: `${quotation.quoteNumber}.pdf`,
          caption,
          mimeType: "application/pdf",
        }),
      });

      if (!docRes.ok) {
        const err = await docRes.json().catch(() => ({ error: "Baileys service unreachable" }));
        return reply.code(502).send({
          error: `Failed to send WhatsApp message: ${(err as any).error || "Unknown error"}`,
        });
      }

      // 3. Send a short text message alongside
      const message = [
        `Hi ${quotation.lead?.name || "there"},`,
        ``,
        `Please find attached your quotation *${quotation.quoteNumber}*.`,
        `*Total: ₹${Number(quotation.total).toLocaleString("en-IN")}*`,
        ``,
        `_Sent from Yash CRM_`,
      ].join("\n");

      await fetch(`${baileysUrl}/api/send/text`, {
        method: "POST",
        headers: baileysHeaders,
        body: JSON.stringify({ to: phone, text: message }),
      });
    }

    await prisma.quotation.update({
      where: { id },
      data: { sharedAt: new Date(), status: "sent" },
    });

    await logActivity({
      leadId: quotation.leadId,
      type: "quotation_sent",
      description: `Quotation ${quotation.quoteNumber} sent via ${channel}`,
      performedBy: request.user!.id,
      metadata: { channel, quoteNumber: quotation.quoteNumber },
    });

    return { success: true, channel };
  });

  // POST /quotations/:id/revise
  app.post("/quotations/:id/revise", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const original = await prisma.quotation.findUnique({ where: { id } });
    if (!original) throw { statusCode: 404, message: "Quotation not found" };

    // Mark original as revised
    await prisma.quotation.update({
      where: { id },
      data: { status: "revised" },
    });

    // Create new version
    const quoteNumber = await generateQuoteNumber();
    const revision = await prisma.quotation.create({
      data: {
        quoteNumber,
        leadId: original.leadId,
        contactId: original.contactId,
        createdBy: request.user!.id,
        lineItems: original.lineItems as any,
        subtotal: original.subtotal,
        discount: original.discount,
        taxRate: original.taxRate,
        taxAmount: original.taxAmount,
        total: original.total,
        validUntil: original.validUntil,
        terms: original.terms,
        notes: original.notes,
        version: original.version + 1,
        parentQuoteId: original.id,
      },
    });

    return reply.code(201).send(revision);
  });

  // GET /q/:quoteNumber — public share link (no auth)
  app.get("/q/:quoteNumber", async (request) => {
    const { quoteNumber } = request.params as { quoteNumber: string };
    const quotation = await prisma.quotation.findUnique({
      where: { quoteNumber },
      include: {
        lead: { select: { name: true, phone: true, email: true } },
        contact: true,
      },
    });
    if (!quotation) throw { statusCode: 404, message: "Quotation not found" };

    // Return sanitized data (no internal IDs exposed beyond what's needed)
    return {
      quoteNumber: quotation.quoteNumber,
      status: quotation.status,
      lineItems: quotation.lineItems,
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      taxRate: quotation.taxRate,
      taxAmount: quotation.taxAmount,
      total: quotation.total,
      validUntil: quotation.validUntil,
      terms: quotation.terms,
      notes: quotation.notes,
      createdAt: quotation.createdAt,
      customerName: quotation.lead?.name || quotation.contact?.name,
      customerPhone: quotation.lead?.phone || quotation.contact?.phone,
      customerEmail: quotation.lead?.email || quotation.contact?.email,
    };
  });
}
