"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/lib/hooks";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Quotation {
  id: string;
  quoteNumber: string;
  status: string;
  lineItems: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    productImage?: string;
    selectedColor?: string;
    selectedColorHex?: string;
    selectedTrim?: string;
    specifications?: { key: string; value: string }[];
    features?: { title: string; description?: string; imageUrl?: string }[];
  }>;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil: string | null;
  terms: string | null;
  notes: string | null;
  pdfUrl: string | null;
  version: number;
  createdAt: string;
  lead?: { id: string; name: string; phone: string; email: string | null };
  contact?: { name: string; phone: string } | null;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-700", label: "Draft" },
  sent: { bg: "bg-blue-50", text: "text-blue-700", label: "Sent" },
  accepted: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Accepted" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
  expired: { bg: "bg-amber-50", text: "text-amber-700", label: "Expired" },
  revised: { bg: "bg-purple-50", text: "text-purple-700", label: "Revised" },
};

function formatCurrency(value: number) {
  return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function QuotationDetailPage() {
  const { fetch: apiFetch, isReady } = useApi();
  const params = useParams();
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    apiFetch<Quotation>(`/quotations/${params.id}`)
      .then(setQuotation)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id, apiFetch, isReady]);

  const captureQuotePdf = useCallback(async (quoteNumber: string): Promise<string> => {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);

    // Create a hidden iframe pointing to the public quotation page
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;height:1200px;border:none;";
    document.body.appendChild(iframe);
    iframe.src = `/q/${quoteNumber}`;

    // Wait for iframe to fully load
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
    });

    const iframeDoc = iframe.contentDocument!;

    // Wait for all images inside iframe to finish loading
    const images = Array.from(iframeDoc.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((r) => {
                img.onload = () => r();
                img.onerror = () => r();
              })
      )
    );
    // Small extra delay for rendering to settle
    await new Promise((r) => setTimeout(r, 300));

    // Hide the no-print elements (PrintTrigger button etc.)
    iframeDoc.querySelectorAll(".no-print").forEach((el) => {
      (el as HTMLElement).style.display = "none";
    });

    // Capture the quote content
    const target = iframeDoc.querySelector(".quote-page") as HTMLElement || iframeDoc.body;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
    });

    document.body.removeChild(iframe);

    // Convert canvas to PDF (A4)
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageHeight = 297; // A4 height in mm
    let position = 0;

    // Add pages for content taller than one A4 page
    while (position < imgHeight) {
      if (position > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.92),
        "JPEG",
        0,
        -position,
        imgWidth,
        imgHeight
      );
      position += pageHeight;
    }

    // Return base64 without the data:... prefix
    const base64 = pdf.output("datauristring").split(",")[1];
    return base64;
  }, []);

  const sendQuote = async (channel: string) => {
    if (!quotation) return;
    try {
      setSending(true);
      setSendError(null);

      let pdfBase64: string | undefined;
      if (channel === "whatsapp") {
        pdfBase64 = await captureQuotePdf(quotation.quoteNumber);
      }

      await apiFetch(`/quotations/${quotation.id}/send`, {
        method: "POST",
        body: JSON.stringify({ channel, pdfBase64 }),
      });
      setQuotation({ ...quotation, status: "sent" });
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : `Failed to send via ${channel}`
      );
    } finally {
      setSending(false);
    }
  };

  const reviseQuote = async () => {
    if (!quotation) return;
    const newQuote = await apiFetch<{ id: string }>(`/quotations/${quotation.id}/revise`, {
      method: "POST",
    });
    router.push(`/quotations/${newQuote.id}`);
  };

  function handleCopyLink() {
    if (!quotation) return;
    const url = `${window.location.origin}/q/${quotation.quoteNumber}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading quotation...</p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Quotation not found.</p>
      </div>
    );
  }

  const items = Array.isArray(quotation.lineItems) ? quotation.lineItems : [];
  const status = statusConfig[quotation.status] || { bg: "bg-gray-100", text: "text-gray-700", label: quotation.status };

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/quotations" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Quotations
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{quotation.quoteNumber}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Version {quotation.version} · Created {formatDate(quotation.createdAt)}
            {quotation.validUntil && ` · Valid until ${formatDate(quotation.validUntil)}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {quotation.status === "draft" && (
            <>
              <Button size="sm" onClick={() => sendQuote("whatsapp")} disabled={sending}>
                {sending ? "Sending..." : "Send via WhatsApp"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => sendQuote("email")} disabled={sending}>
                Send via Email
              </Button>
            </>
          )}
          {quotation.status === "sent" && (
            <>
              <Button variant="outline" size="sm" onClick={reviseQuote}>
                Create Revision
              </Button>
              <Button size="sm" onClick={() => sendQuote("whatsapp")} disabled={sending}>
                {sending ? "Sending..." : "Resend via WhatsApp"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => sendQuote("email")} disabled={sending}>
                Resend via Email
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/q/${quotation.quoteNumber}?print=1`, '_blank')}
          >
            <svg className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
          >
            <svg className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            {linkCopied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      </div>

      {sendError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-2">
          {sendError}
        </div>
      )}

      {/* Customer & Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {quotation.lead ? (
              <div className="space-y-1">
                <p className="font-medium">{quotation.lead.name}</p>
                <p className="text-sm text-muted-foreground">{quotation.lead.phone}</p>
                {quotation.lead.email && (
                  <p className="text-sm text-muted-foreground">{quotation.lead.email}</p>
                )}
                <button
                  onClick={() => setDrawerLeadId(quotation.lead!.id)}
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  View Lead →
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No lead linked</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">{items.length} line item{items.length !== 1 ? "s" : ""}</span>
                <span className="text-xl font-bold tracking-tight">{formatCurrency(quotation.total)}</span>
              </div>
              {Number(quotation.discount) > 0 && (
                <p className="text-xs text-emerald-600">
                  Includes {formatCurrency(quotation.discount)} discount
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <div className="mt-6 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Vehicles</h3>
        {items.map((item, i) => {
          const featuresWithImages = item.features?.filter((f) => f.imageUrl) || [];
          const allFeatures = item.features || [];

          return (
            <Card key={i} className="overflow-hidden">
              {/* Full-width hero image */}
              {item.productImage && (
                <div className="bg-muted flex items-center justify-center p-4">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="max-h-56 w-auto object-contain"
                  />
                </div>
              )}

              <CardContent className="pt-5">
                {/* Name + color/trim + price */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-semibold">{item.productName}</h4>
                    {(item.selectedColor || item.selectedTrim) && (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {item.selectedColor && (
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            {item.selectedColorHex && (
                              <span
                                className="inline-block w-3 h-3 rounded-full border border-black/10"
                                style={{ backgroundColor: item.selectedColorHex }}
                              />
                            )}
                            {item.selectedColor}
                          </span>
                        )}
                        {item.selectedColor && item.selectedTrim && (
                          <span className="text-muted-foreground/40">·</span>
                        )}
                        {item.selectedTrim && (
                          <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                            {item.selectedTrim}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold tabular-nums">{formatCurrency(item.total)}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground tabular-nums">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                    )}
                  </div>
                </div>

                {/* Specifications */}
                {item.specifications && item.specifications.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Specifications</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      {item.specifications.map((spec, si) => (
                        <div key={si} className="flex justify-between text-xs py-0.5">
                          <span className="text-muted-foreground">{spec.key}</span>
                          <span className="font-medium text-right ml-2">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {allFeatures.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Features</p>

                    {/* Feature images grid */}
                    {featuresWithImages.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                        {featuresWithImages.map((feat, fi) => (
                          <div key={fi} className="rounded-lg border overflow-hidden bg-muted/50">
                            <img
                              src={feat.imageUrl!}
                              alt={feat.title}
                              className="w-full h-24 object-cover"
                            />
                            <div className="px-2.5 py-1.5">
                              <p className="text-xs font-medium leading-tight">{feat.title}</p>
                              {feat.description && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{feat.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Text-only features as pills */}
                    {allFeatures.filter((f) => !f.imageUrl).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {allFeatures.filter((f) => !f.imageUrl).map((feat, fi) => (
                          <span key={fi} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                            {feat.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Totals */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(quotation.subtotal)}</span>
            </div>
            {Number(quotation.discount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span className="tabular-nums">-{formatCurrency(quotation.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({Number(quotation.taxRate)}%)</span>
              <span className="tabular-nums">{formatCurrency(quotation.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2.5 mt-2.5">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(quotation.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms */}
      {quotation.terms && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{quotation.terms}</p>
          </CardContent>
        </Card>
      )}

      <LeadDetailDrawer
        leadId={drawerLeadId}
        open={drawerLeadId !== null}
        onOpenChange={(open) => { if (!open) setDrawerLeadId(null); }}
      />
    </div>
  );
}
