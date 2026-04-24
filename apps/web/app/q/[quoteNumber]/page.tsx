import { notFound } from "next/navigation";
import { PrintTrigger } from "./print-trigger";
import { API_URL } from "@/lib/api";

interface QuoteData {
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
  createdAt: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
}

async function getQuote(quoteNumber: string): Promise<QuoteData | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/q/${quoteNumber}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

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

export default async function PublicQuotePage({
  params,
}: {
  params: { quoteNumber: string };
}) {
  const quote = await getQuote(params.quoteNumber);
  if (!quote) notFound();

  const items = Array.isArray(quote.lineItems) ? quote.lineItems : [];

  return (
    <>
      <style>{`
        @media print {
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .quote-page { padding: 0 !important; min-height: auto !important; background: white !important; }
          .quote-card { box-shadow: none !important; border: none !important; border-radius: 0 !important; max-width: none !important; margin: 0 !important; }
          .quote-accent { display: none !important; }
          .vehicle-card { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print">
        <PrintTrigger />
      </div>

      <div className="min-h-screen bg-slate-50/80 py-6 px-4 sm:py-10 quote-page">
        <div className="mx-auto max-w-3xl quote-card">
          {/* Accent bar */}
          <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-slate-800 to-slate-600 quote-accent" />

          <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 border-t-0">
            <div className="p-6 sm:p-10">

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    LeadCRM
                  </h1>
                  <p className="text-[13px] text-slate-400 mt-0.5 uppercase tracking-wider font-medium">
                    Quotation
                  </p>
                </div>
                <div className="sm:text-right space-y-0.5">
                  <p className="text-base font-semibold text-slate-900 tracking-tight">
                    {quote.quoteNumber}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(quote.createdAt)}
                  </p>
                  {quote.validUntil && (
                    <p className="text-sm text-slate-500">
                      Valid until {formatDate(quote.validUntil)}
                    </p>
                  )}
                </div>
              </div>

              {/* Bill To */}
              {(quote.customerName || quote.customerPhone || quote.customerEmail) && (
                <div className="mb-8 pb-8 border-b border-slate-100">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Bill To
                  </p>
                  {quote.customerName && (
                    <p className="text-[15px] font-medium text-slate-800">
                      {quote.customerName}
                    </p>
                  )}
                  {quote.customerPhone && (
                    <p className="text-sm text-slate-500">{quote.customerPhone}</p>
                  )}
                  {quote.customerEmail && (
                    <p className="text-sm text-slate-500">{quote.customerEmail}</p>
                  )}
                </div>
              )}

              {/* Vehicle Cards */}
              <div className="space-y-6 mb-8">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Vehicles
                </p>
                {items.map((item, i) => {
                  const featuresWithImages = item.features?.filter((f) => f.imageUrl) || [];
                  const allFeatures = item.features || [];

                  return (
                    <div
                      key={i}
                      className="vehicle-card rounded-lg border border-slate-200 overflow-hidden"
                    >
                      {/* Full-width hero image */}
                      {item.productImage && (
                        <div className="bg-slate-50 flex items-center justify-center p-4">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="max-h-64 w-auto object-contain"
                          />
                        </div>
                      )}

                      {/* Vehicle details */}
                      <div className="p-5 sm:p-6">
                        {/* Name + color/trim + price */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {item.productName}
                            </h3>
                            {(item.selectedColor || item.selectedTrim) && (
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {item.selectedColor && (
                                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
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
                                  <span className="text-slate-300">·</span>
                                )}
                                {item.selectedTrim && (
                                  <span className="text-sm text-slate-600">
                                    {item.selectedTrim}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-slate-900 tabular-nums">
                              {formatCurrency(item.total)}
                            </p>
                            {(item.quantity > 1) && (
                              <p className="text-xs text-slate-500 tabular-nums">
                                {item.quantity} × {formatCurrency(item.unitPrice)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Specifications */}
                        {item.specifications && item.specifications.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                              Specifications
                            </p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                              {item.specifications.map((spec, si) => (
                                <div key={si} className="flex justify-between text-xs py-0.5">
                                  <span className="text-slate-400">{spec.key}</span>
                                  <span className="text-slate-700 font-medium text-right ml-2">{spec.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Features */}
                        {allFeatures.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                              Features
                            </p>

                            {/* Feature images grid */}
                            {featuresWithImages.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                                {featuresWithImages.map((feat, fi) => (
                                  <div key={fi} className="rounded-lg border border-slate-100 overflow-hidden bg-slate-50">
                                    <img
                                      src={feat.imageUrl!}
                                      alt={feat.title}
                                      className="w-full h-24 object-cover"
                                    />
                                    <div className="px-2.5 py-1.5">
                                      <p className="text-xs font-medium text-slate-700 leading-tight">{feat.title}</p>
                                      {feat.description && (
                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{feat.description}</p>
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
                                  <span
                                    key={fi}
                                    className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                                  >
                                    {feat.title}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-full sm:w-72 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatCurrency(quote.subtotal)}</span>
                  </div>
                  {Number(quote.discount) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span className="tabular-nums">-{formatCurrency(quote.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>GST ({Number(quote.taxRate)}%)</span>
                    <span className="tabular-nums">{formatCurrency(quote.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t-2 border-slate-800 pt-3 mt-3">
                    <span className="text-base font-bold text-slate-900">Total</span>
                    <span className="text-lg font-bold text-slate-900 tabular-nums">
                      {formatCurrency(quote.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              {quote.terms && (
                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                    Terms & Conditions
                  </h3>
                  <p className="text-sm text-slate-500 whitespace-pre-wrap leading-relaxed">
                    {quote.terms}
                  </p>
                </div>
              )}

              {/* Notes */}
              {quote.notes && (
                <div className="pt-6 mt-4 border-t border-slate-100">
                  <h3 className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                    Notes
                  </h3>
                  <p className="text-sm text-slate-500 whitespace-pre-wrap leading-relaxed">
                    {quote.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 sm:px-10 py-5 bg-slate-50/50 rounded-b-xl border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                Generated by LeadCRM
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
