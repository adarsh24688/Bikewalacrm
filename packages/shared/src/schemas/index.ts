import { z } from "zod";

// ─── Lead Schemas ────────────────────────────────────────────
export const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  email: z.string().email().optional().or(z.literal("")),
  source: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: z
    .enum([
      "new",
      "contacted",
      "qualified",
      "proposal_sent",
      "negotiation",
      "won",
      "lost",
    ])
    .default("new"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  productInterest: z.array(z.string()).default([]),
  notes: z.string().optional(),
  nextFollowUp: z.string().datetime().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

// ─── Contact Schemas ─────────────────────────────────────────
export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  company: z.string().optional(),
  leadId: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
});

// ─── Quotation Schemas ───────────────────────────────────────
export const lineItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export const createQuotationSchema = z.object({
  leadId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(18),
  validUntil: z.string().datetime().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Follow-Up Schemas ──────────────────────────────────────
export const createFollowUpSchema = z.object({
  leadId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  type: z.enum(["call", "whatsapp", "email", "visit", "meeting"]),
  notes: z.string().optional(),
});

// ─── Product Schemas ─────────────────────────────────────────
export const colorVariantSchema = z.object({
  name: z.string().min(1),
  hexCode: z.string().min(1),
  imageUrl: z.string().optional(),
});

export const specificationSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export const featureSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const trimSchema = z.object({
  name: z.string().min(1),
  priceDiff: z.number(),
});

export const createProductSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["ev", "motorcycle", "scooter"]),
  subSegment: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.number().nonnegative(),
  unit: z.string().optional(),
  heroImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  colorVariants: z.array(colorVariantSchema).optional(),
  specifications: z.array(specificationSchema).optional(),
  features: z.array(featureSchema).optional(),
  trims: z.array(trimSchema).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateProductSchema = createProductSchema.partial();

// ─── Branch Schemas ──────────────────────────────────────────
export const createBranchSchema = z.object({
  name: z.string().min(1),
  city: z.string().optional(),
  address: z.string().optional(),
});

// ─── AllowedUser Schemas ─────────────────────────────────────
export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["super_admin", "manager", "sales_rep", "frontdesk"]),
  branchId: z.string().uuid().optional(),
});
