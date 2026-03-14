"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useApi } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductPickerModal } from "@/components/product-picker-modal";

interface Product {
  id: string;
  name: string;
  basePrice: number;
  unit: string | null;
  category: string | null;
  tagline?: string;
  heroImage?: string;
  colorVariants?: { name: string; hexCode: string; imageUrl?: string }[];
  trims?: { name: string; priceDiff: number }[];
  specifications?: { key: string; value: string }[];
  features?: { title: string; description?: string; imageUrl?: string }[];
}

interface LeadSearchResult {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface LineItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  selectedColor?: string;
  selectedColorHex?: string;
  selectedTrim?: string;
  productImage?: string;
  specifications?: { key: string; value: string }[];
  features?: { title: string; description?: string; imageUrl?: string }[];
}

interface QuoteTemplate {
  id: string;
  name: string;
  type: "terms" | "notes";
  content: string;
}

function QuoteBuilderContent() {
  const { fetch: apiFetch, isReady } = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLeadId = searchParams.get("leadId") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [formLeadId, setFormLeadId] = useState(initialLeadId);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [productPickerOpen, setProductPickerOpen] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState<"terms" | "notes" | null>(null);
  const [templateName, setTemplateName] = useState("");

  // Lead search state
  const [leadSearch, setLeadSearch] = useState("");
  const [leadResults, setLeadResults] = useState<LeadSearchResult[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadSearchResult | null>(null);
  const [leadSearchLoading, setLeadSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isReady) return;
    apiFetch<Product[]>("/products?active=true")
      .then(setProducts)
      .catch(() => {});
    apiFetch<QuoteTemplate[]>("/quote-templates")
      .then(setTemplates)
      .catch(() => {});
  }, [apiFetch, isReady]);

  const saveAsTemplate = async (type: "terms" | "notes") => {
    const content = type === "terms" ? terms : notes;
    if (!templateName.trim() || !content.trim()) return;
    try {
      const created = await apiFetch<QuoteTemplate>("/quote-templates", {
        method: "POST",
        body: JSON.stringify({ name: templateName.trim(), type, content }),
      });
      setTemplates((prev) => [created, ...prev]);
      setSavingTemplate(null);
      setTemplateName("");
    } catch {}
  };

  // If we have an initial leadId from URL, fetch that lead's info
  useEffect(() => {
    if (!isReady) return;
    if (initialLeadId) {
      apiFetch<LeadSearchResult>(`/leads/${initialLeadId}`)
        .then((lead) => {
          setSelectedLead(lead);
          setLeadSearch(lead.name);
        })
        .catch(() => {});
    }
  }, [initialLeadId, apiFetch, isReady]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchLeads = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setLeadResults([]);
        return;
      }
      setLeadSearchLoading(true);
      try {
        const res = await apiFetch<{ data: LeadSearchResult[] }>(
          `/leads?search=${encodeURIComponent(query)}&pageSize=8`
        );
        setLeadResults(res.data);
      } catch {
        setLeadResults([]);
      } finally {
        setLeadSearchLoading(false);
      }
    },
    [apiFetch]
  );

  const handleLeadSearchChange = (value: string) => {
    setLeadSearch(value);
    setShowDropdown(true);

    // Clear selection if user is typing something different
    if (selectedLead && value !== selectedLead.name) {
      setSelectedLead(null);
      setFormLeadId("");
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchLeads(value), 300);
  };

  const handleSelectLead = (lead: LeadSearchResult) => {
    setSelectedLead(lead);
    setFormLeadId(lead.id);
    setLeadSearch(lead.name);
    setShowDropdown(false);
  };

  const handleClearLead = () => {
    setSelectedLead(null);
    setFormLeadId("");
    setLeadSearch("");
    setLeadResults([]);
  };

  const addLineItem = (product?: Product) => {
    setLineItems([
      ...lineItems,
      {
        productId: product?.id,
        productName: product?.name || "",
        quantity: 1,
        unitPrice: product ? Number(product.basePrice) : 0,
        total: product ? Number(product.basePrice) : 0,
        productImage: product?.heroImage || undefined,
        specifications: product?.specifications || undefined,
        features: product?.features || undefined,
      },
    ]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    if (field === "quantity" || field === "unitPrice") {
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }
    // If color selected, store hex code too
    if (field === "selectedColor") {
      const product = products.find((p) => p.id === updated[index].productId);
      const color = product?.colorVariants?.find((c) => c.name === value);
      updated[index].selectedColorHex = color?.hexCode || undefined;
    }
    // If trim selected, adjust price
    if (field === "selectedTrim") {
      const product = products.find((p) => p.id === updated[index].productId);
      if (product?.trims) {
        const trim = product.trims.find((t) => t.name === value);
        if (trim) {
          updated[index].unitPrice = Number(product.basePrice) + trim.priceDiff;
          updated[index].total = updated[index].quantity * updated[index].unitPrice;
        }
      }
    }
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxableAmount = subtotal - discount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

  const handleSubmit = async () => {
    if (!formLeadId || lineItems.length === 0) return;
    setSubmitting(true);
    try {
      const data = await apiFetch<{ id: string }>("/quotations", {
        method: "POST",
        body: JSON.stringify({
          leadId: formLeadId,
          lineItems,
          discount,
          taxRate,
          terms,
          notes,
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        }),
      });
      router.push(`/quotations/${data.id}`);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const getProductForItem = (item: LineItem) =>
    item.productId ? products.find((p) => p.id === item.productId) : undefined;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Create Quotation</h1>

      <div className="space-y-6">
        {/* Lead Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLead ? (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{selectedLead.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedLead.phone}
                    {selectedLead.email && ` · ${selectedLead.email}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearLead}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <Input
                  placeholder="Search by customer name or phone..."
                  value={leadSearch}
                  onChange={(e) => handleLeadSearchChange(e.target.value)}
                  onFocus={() => leadSearch.length >= 2 && setShowDropdown(true)}
                />
                {showDropdown && (leadResults.length > 0 || leadSearchLoading) && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-60 overflow-y-auto">
                    {leadSearchLoading ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        Searching...
                      </div>
                    ) : (
                      leadResults.map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => handleSelectLead(lead)}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b last:border-0"
                        >
                          <p className="text-sm font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.phone}
                            {lead.email && ` · ${lead.email}`}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {leadSearch.length >= 2 && !leadSearchLoading && leadResults.length === 0 && showDropdown && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg p-3 text-sm text-muted-foreground text-center">
                    No leads found for &quot;{leadSearch}&quot;
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lineItems.map((item, i) => {
              const product = getProductForItem(item);
              return (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  {/* Header row: image + name + remove */}
                  <div className="flex items-center gap-3">
                    {item.productImage && (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-12 h-9 rounded object-cover shrink-0 bg-muted"
                      />
                    )}
                    <Input
                      className="flex-1 min-w-0"
                      placeholder="Product name"
                      value={item.productName}
                      onChange={(e) => updateLineItem(i, "productName", e.target.value)}
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeLineItem(i)} className="shrink-0">
                      ✕
                    </Button>
                  </div>

                  {/* Qty / Price / Total row */}
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(i, "quantity", Number(e.target.value))}
                    />
                    <Input
                      type="number"
                      placeholder="Unit price"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(i, "unitPrice", Number(e.target.value))}
                    />
                    <span className="text-sm font-medium tabular-nums whitespace-nowrap pl-1">
                      ₹{item.total.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Color & Trim selection for catalog products */}
                  {product && (
                    <div className="flex flex-wrap gap-2">
                      {product.colorVariants && product.colorVariants.length > 0 && (
                        <select
                          className="rounded-md border px-2 py-1 text-xs flex-1 min-w-[140px]"
                          value={item.selectedColor || ""}
                          onChange={(e) => updateLineItem(i, "selectedColor", e.target.value)}
                        >
                          <option value="">Select color...</option>
                          {product.colorVariants.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {product.trims && product.trims.length > 0 && (
                        <select
                          className="rounded-md border px-2 py-1 text-xs flex-1 min-w-[140px]"
                          value={item.selectedTrim || ""}
                          onChange={(e) => updateLineItem(i, "selectedTrim", e.target.value)}
                        >
                          <option value="">Select variant...</option>
                          {product.trims.map((t) => (
                            <option key={t.name} value={t.name}>
                              {t.name} {t.priceDiff > 0 ? `(+₹${t.priceDiff.toLocaleString("en-IN")})` : t.priceDiff < 0 ? `(-₹${Math.abs(t.priceDiff).toLocaleString("en-IN")})` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setProductPickerOpen(true)}
            >
              + Add Vehicle
            </Button>

            <ProductPickerModal
              open={productPickerOpen}
              onOpenChange={setProductPickerOpen}
              products={products}
              mode="single-add"
              onProductSelect={(product) => addLineItem(product as Product)}
            />
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Discount</span>
              <Input
                className="w-28 text-right"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Tax Rate (%)</span>
              <Input
                className="w-28 text-right"
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax Amount</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-3">
              <span>Total</span>
              <span>₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div>
              <label className="text-sm font-medium">Valid Until</label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Terms & Conditions</label>
                <div className="flex items-center gap-2">
                  {templates.filter((t) => t.type === "terms").length > 0 && (
                    <select
                      className="rounded-md border px-2 py-1 text-xs text-muted-foreground"
                      value=""
                      onChange={(e) => {
                        const tpl = templates.find((t) => t.id === e.target.value);
                        if (tpl) setTerms(tpl.content);
                      }}
                    >
                      <option value="">Load template...</option>
                      {templates
                        .filter((t) => t.type === "terms")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  )}
                  {savingTemplate === "terms" ? (
                    <span className="flex items-center gap-1">
                      <input
                        className="rounded border px-2 py-0.5 text-xs w-32"
                        placeholder="Template name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveAsTemplate("terms")}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => saveAsTemplate("terms")}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={() => { setSavingTemplate(null); setTemplateName(""); }}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    terms.trim() && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setSavingTemplate("terms")}
                      >
                        Save as template
                      </button>
                    )
                  )}
                </div>
              </div>
              <textarea
                className="w-full rounded-md border p-2 text-sm min-h-[80px]"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Enter terms and conditions..."
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Notes</label>
                <div className="flex items-center gap-2">
                  {templates.filter((t) => t.type === "notes").length > 0 && (
                    <select
                      className="rounded-md border px-2 py-1 text-xs text-muted-foreground"
                      value=""
                      onChange={(e) => {
                        const tpl = templates.find((t) => t.id === e.target.value);
                        if (tpl) setNotes(tpl.content);
                      }}
                    >
                      <option value="">Load template...</option>
                      {templates
                        .filter((t) => t.type === "notes")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  )}
                  {savingTemplate === "notes" ? (
                    <span className="flex items-center gap-1">
                      <input
                        className="rounded border px-2 py-0.5 text-xs w-32"
                        placeholder="Template name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveAsTemplate("notes")}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => saveAsTemplate("notes")}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={() => { setSavingTemplate(null); setTemplateName(""); }}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    notes.trim() && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setSavingTemplate("notes")}
                      >
                        Save as template
                      </button>
                    )
                  )}
                </div>
              </div>
              <textarea
                className="w-full rounded-md border p-2 text-sm min-h-[60px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !formLeadId || lineItems.length === 0}>
            {submitting ? "Creating..." : "Create Quotation"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <Suspense>
      <QuoteBuilderContent />
    </Suspense>
  );
}
