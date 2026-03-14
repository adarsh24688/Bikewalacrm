// ─── Role & Enums ────────────────────────────────────────────
export enum Role {
  SUPER_ADMIN = "super_admin",
  MANAGER = "manager",
  SALES_REP = "sales_rep",
  FRONTDESK = "frontdesk",
}

export enum LeadStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  PROPOSAL_SENT = "proposal_sent",
  NEGOTIATION = "negotiation",
  WON = "won",
  LOST = "lost",
}

export enum LeadPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum FollowUpType {
  CALL = "call",
  WHATSAPP = "whatsapp",
  EMAIL = "email",
  VISIT = "visit",
  MEETING = "meeting",
}

export enum FollowUpStatus {
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  MISSED = "missed",
  CANCELLED = "cancelled",
}

export enum QuotationStatus {
  DRAFT = "draft",
  SENT = "sent",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  EXPIRED = "expired",
  REVISED = "revised",
}

export enum MessageDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

export enum MessageStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

export enum WaSessionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
}

export enum ProductCategory {
  EV = "ev",
  MOTORCYCLE = "motorcycle",
  SCOOTER = "scooter",
}

// ─── Core Types ──────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: Role;
  branchId?: string;
  isActive: boolean;
}

export interface Branch {
  id: string;
  name: string;
  city?: string;
  address?: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  assignedTo?: string;
  branchId?: string;
  status: LeadStatus;
  priority: LeadPriority;
  productInterest: string[];
  notes?: string;
  nextFollowUp?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  company?: string;
  leadId?: string;
  tags: string[];
}

export interface ProductColorVariant {
  name: string;
  hexCode: string;
  imageUrl?: string;
}

export interface ProductSpecification {
  key: string;
  value: string;
}

export interface ProductFeature {
  title: string;
  description?: string;
  imageUrl?: string;
}

export interface ProductTrim {
  name: string;
  priceDiff: number;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  subSegment?: string;
  tagline?: string;
  description?: string;
  basePrice: number;
  unit?: string;
  heroImage?: string;
  images?: string[];
  colorVariants?: ProductColorVariant[];
  specifications?: ProductSpecification[];
  features?: ProductFeature[];
  trims?: ProductTrim[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  leadId: string;
  contactId?: string;
  createdBy: string;
  status: QuotationStatus;
  lineItems: Record<string, unknown>[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil?: Date;
  terms?: string;
  notes?: string;
  pdfUrl?: string;
  version: number;
  parentQuoteId?: string;
  sharedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Report Types ─────────────────────────────────────────────

export interface PipelineFunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

export interface QuotationAnalysis {
  total: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  acceptanceRate: number;
  averageValue: number;
  totalRevenue: number;
}

export interface DealVelocity {
  stage: string;
  avgDays: number;
  leadCount: number;
}
