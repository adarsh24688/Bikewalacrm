"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApi } from "@/lib/hooks";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  total: number;
  createdAt: string;
  validUntil: string | null;
  lead?: { id: string; name: string; phone: string };
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-yellow-100 text-yellow-800",
  revised: "bg-purple-100 text-purple-800",
};

export default function QuotationsPage() {
  const { fetch: apiFetch, isReady } = useApi();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const data = await apiFetch<{ data: Quotation[]; total: number }>(`/quotations?${params}`);
      setQuotations(data.data || []);
      setTotal(data.total || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, apiFetch]);

  useEffect(() => {
    if (!isReady) return;
    fetchQuotations();
  }, [fetchQuotations, isReady]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quotations</h1>
        <Link href="/quotations/new">
          <Button>Create Quote</Button>
        </Link>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by customer name, phone, or quote number..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSearch(searchInput);
              setPage(1);
            }
          }}
          onBlur={() => {
            if (searchInput !== search) {
              setSearch(searchInput);
              setPage(1);
            }
          }}
          className="max-w-md"
        />
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {["", "draft", "sent", "accepted", "rejected"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className="capitalize"
          >
            {s || "All"}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : quotations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No quotations yet.</p>
            <Link href="/quotations/new">
              <Button className="mt-4">Create your first quote</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
        {/* Desktop Table */}
        <div className="hidden md:block rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Quote #</th>
                <th className="p-3 text-left font-medium">Lead</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-right font-medium">Total</th>
                <th className="p-3 text-left font-medium">Valid Until</th>
                <th className="p-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/quotations/${q.id}`} className="font-medium text-primary hover:underline">{q.quoteNumber}</Link>
                  </td>
                  <td className="p-3">{q.lead ? <button onClick={() => setDrawerLeadId(q.lead!.id)} className="hover:underline text-left">{q.lead.name}</button> : "—"}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[q.status] || ""}`}>{q.status}</span>
                  </td>
                  <td className="p-3 text-right font-medium">₹{Number(q.total).toLocaleString("en-IN")}</td>
                  <td className="p-3 text-muted-foreground">{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "—"}</td>
                  <td className="p-3 text-muted-foreground">{new Date(q.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-3">
          {quotations.map((q) => (
            <Link key={q.id} href={`/quotations/${q.id}`} className="block rounded-lg border p-3 active:bg-muted/50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{q.quoteNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">{q.lead?.name || "No lead"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[q.status] || ""}`}>{q.status}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">₹{Number(q.total).toLocaleString("en-IN")}</span>
                <span>{new Date(q.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>

        {total > 20 && (
          <div className="flex items-center justify-between p-3 border-t mt-3 md:mt-0 md:border rounded-lg md:rounded-t-none">
            <span className="text-sm text-muted-foreground">{total} quotations</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}>Next</Button>
            </div>
          </div>
        )}
        </>
      )}

      <LeadDetailDrawer
        leadId={drawerLeadId}
        open={drawerLeadId !== null}
        onOpenChange={(open) => { if (!open) setDrawerLeadId(null); }}
      />
    </div>
  );
}
