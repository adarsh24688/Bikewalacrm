"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/lib/hooks";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTeamMembers } from "@/lib/use-team-members";
import { Plus, Search, X } from "lucide-react";
import { ProductPickerModal } from "@/components/product-picker-modal";

interface PickerProduct {
  id: string;
  name: string;
  basePrice: number;
  category: string | null;
  tagline?: string;
  heroImage?: string;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "social_media", label: "Social Media" },
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "advertisement", label: "Advertisement" },
  { value: "other", label: "Other" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  qualified: "bg-orange-50 text-orange-700 border-orange-200",
  proposal_sent: "bg-purple-50 text-purple-700 border-purple-200",
  negotiation: "bg-indigo-50 text-indigo-700 border-indigo-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-red-50 text-red-700 border-red-200",
};

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  source: string;
  priority: string;
  assignedTo: string | null;
  nextFollowUp: string | null;
  createdAt: string;
}

interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface LeadFormData {
  name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  priority: string;
  notes: string;
  productInterest: string[];
}

const INITIAL_FORM: LeadFormData = {
  name: "",
  phone: "",
  email: "",
  source: "website",
  status: "new",
  priority: "medium",
  notes: "",
  productInterest: [],
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string): string {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  return found ? found.label : status;
}

export default function LeadsPage() {
  const { fetch: apiFetch, isReady } = useApi();
  const { getMemberName } = useTeamMembers();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<LeadFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);

  const [catalogProducts, setCatalogProducts] = useState<PickerProduct[]>([]);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    apiFetch<PickerProduct[]>("/products?active=true")
      .then(setCatalogProducts)
      .catch(() => {});
  }, [apiFetch, isReady]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const json = await apiFetch<LeadsResponse>(`/leads?${params.toString()}`);
      setLeads(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, pageSize, apiFetch]);

  useEffect(() => {
    if (!isReady) return;
    fetchLeads();
  }, [fetchLeads, isReady]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  function handleFormChange(
    field: keyof LeadFormData,
    value: string
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!formData.phone.trim()) {
      setFormError("Phone is required");
      return;
    }
    const cleanedPhone = formData.phone.replace(/^(\+91|91|0)/, "").replace(/[\s-]/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
      setFormError("Must be a valid 10-digit Indian mobile number");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/leads", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setDialogOpen(false);
      setFormData(INITIAL_FORM);
      fetchLeads();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create lead"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleRowClick(id: string) {
    setDrawerLeadId(id);
  }

  function handleOpenDialog() {
    setFormData(INITIAL_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">
            Manage your leads and track their progress through the pipeline.
          </p>
        </div>
        <Button onClick={handleOpenDialog} size="sm" className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:max-w-xs"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                {total} result{total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Desktop Table */}
      <Card className="shadow-sm hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Follow-up</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm text-muted-foreground">Loading leads...</td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm text-muted-foreground">No leads found. Try adjusting your search or filters.</td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => handleRowClick(lead.id)}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 text-sm font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{lead.phone}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline" className={STATUS_COLORS[lead.status] || "bg-gray-50 text-gray-700 border-gray-200"}>
                        {statusLabel(lead.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{lead.source?.replace(/_/g, " ") || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={
                        lead.priority === "high"
                          ? "inline-flex items-center gap-1 text-red-600 font-medium"
                          : lead.priority === "medium"
                          ? "text-amber-600 font-medium"
                          : "text-muted-foreground"
                      }>
                        {lead.priority === "high" && <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />}
                        {lead.priority ? lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1) : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{getMemberName(lead.assignedTo)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTime(lead.nextFollowUp)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(lead.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading leads...</p>
        ) : leads.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No leads found. Try adjusting your search or filters.</p>
        ) : (
          leads.map((lead) => (
            <Card
              key={lead.id}
              onClick={() => handleRowClick(lead.id)}
              className="cursor-pointer shadow-sm transition-colors active:bg-muted/50"
            >
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{lead.phone}</p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 ${STATUS_COLORS[lead.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                    {statusLabel(lead.status)}
                  </Badge>
                </div>
                <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className={lead.priority === "high" ? "text-red-600 font-medium" : lead.priority === "medium" ? "text-amber-600 font-medium" : ""}>
                    {lead.priority ? lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1) : "-"}
                  </span>
                  <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                  <span className="capitalize">{lead.source?.replace(/_/g, " ") || "-"}</span>
                  <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                  <span>{getMemberName(lead.assignedTo)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex items-center justify-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <span className="text-sm text-muted-foreground sm:hidden">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Lead Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new lead.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="lead-name" className="text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="lead-name"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="lead-phone" className="text-sm font-medium">
                Phone <span className="text-red-500">*</span>
              </label>
              <Input
                id="lead-phone"
                placeholder="Phone number"
                value={formData.phone}
                onChange={(e) => handleFormChange("phone", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="lead-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="lead-email"
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => handleFormChange("email", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="lead-source" className="text-sm font-medium">
                  Source
                </label>
                <select
                  id="lead-source"
                  value={formData.source}
                  onChange={(e) => handleFormChange("source", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="lead-status" className="text-sm font-medium">
                  Status
                </label>
                <select
                  id="lead-status"
                  value={formData.status}
                  onChange={(e) => handleFormChange("status", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="lead-priority" className="text-sm font-medium">
                Priority
              </label>
              <select
                id="lead-priority"
                value={formData.priority}
                onChange={(e) => handleFormChange("priority", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Vehicle Interest</label>
              <Button
                type="button"
                variant="outline"
                className="justify-start text-muted-foreground font-normal"
                onClick={() => setVehiclePickerOpen(true)}
              >
                {formData.productInterest.length > 0
                  ? `${formData.productInterest.length} vehicle${formData.productInterest.length > 1 ? "s" : ""} selected`
                  : "Select vehicles..."}
              </Button>
              {formData.productInterest.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formData.productInterest.map((name) => (
                    <Badge
                      key={name}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            productInterest: prev.productInterest.filter(
                              (n) => n !== name
                            ),
                          }))
                        }
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="lead-notes" className="text-sm font-medium">
                Notes
              </label>
              <textarea
                id="lead-notes"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating..." : "Create Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductPickerModal
        open={vehiclePickerOpen}
        onOpenChange={setVehiclePickerOpen}
        products={catalogProducts}
        mode="multi-select"
        selectedProductNames={formData.productInterest}
        onSelectionChange={(names) =>
          setFormData((prev) => ({ ...prev, productInterest: names }))
        }
      />

      <LeadDetailDrawer
        leadId={drawerLeadId}
        open={drawerLeadId !== null}
        onOpenChange={(open) => { if (!open) setDrawerLeadId(null); }}
      />
    </div>
  );
}
