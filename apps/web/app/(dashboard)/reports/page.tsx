"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DateRangePicker } from "@/components/date-range-picker";
import { exportToCSV } from "@/lib/csv-export";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type TabKey = "overview" | "pipeline" | "revenue" | "quotations" | "team";

interface DashboardData {
  totalLeads: number;
  newLeadsThisWeek: number;
  conversionRate: number;
  revenue: number;
  followUpsDueToday: number;
  activeConversations: number;
  leadsByStatus: Array<{ status: string; count: number }>;
  leadsBySource: Array<{ source: string; count: number }>;
}

interface RepStat {
  id: string;
  name: string;
  email: string;
  leadsAssigned: number;
  followedUp: number;
  converted: number;
  conversionRate: string;
}

interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
}

interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

interface QuotationAnalysis {
  total: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  acceptanceRate: number;
  averageValue: number;
  totalRevenue: number;
}

interface DealVelocity {
  stage: string;
  avgDays: number;
  leadCount: number;
}

const COLORS = ["#3b82f6", "#f59e0b", "#f97316", "#8b5cf6", "#6366f1", "#22c55e", "#ef4444", "#14b8a6"];

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  revised: "Revised",
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "pipeline", label: "Pipeline" },
  { key: "revenue", label: "Revenue" },
  { key: "quotations", label: "Quotations" },
  { key: "team", label: "Team" },
];

export default function ReportsPage() {
  const { fetch: apiFetch, isReady } = useApi();
  const [tab, setTab] = useState<TabKey>("overview");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [leadTrend, setLeadTrend] = useState<Array<{ date: string; count: number }>>([]);
  const [repStats, setRepStats] = useState<RepStat[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [quotationAnalysis, setQuotationAnalysis] = useState<QuotationAnalysis | null>(null);
  const [dealVelocity, setDealVelocity] = useState<DealVelocity[]>([]);

  const qs = `from=${from}&to=${to}`;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashData, trendData, repData, funnelData, revData, qaData, dvData] =
        await Promise.all([
          apiFetch<DashboardData>(`/reports/dashboard?${qs}`),
          apiFetch<Array<{ date: string; count: number }>>(`/reports/leads?${qs}`),
          apiFetch<RepStat[]>(`/reports/reps?${qs}`).catch(() => [] as RepStat[]),
          apiFetch<FunnelStage[]>(`/reports/pipeline-funnel?${qs}`),
          apiFetch<RevenueTrendPoint[]>(`/reports/revenue-trend?${qs}`),
          apiFetch<QuotationAnalysis>(`/reports/quotation-analysis?${qs}`),
          apiFetch<DealVelocity[]>(`/reports/deal-velocity?${qs}`),
        ]);

      setDashboard(dashData);
      setLeadTrend(trendData);
      setRepStats(repData);
      setFunnel(funnelData);
      setRevenueTrend(revData);
      setQuotationAnalysis(qaData);
      setDealVelocity(dvData);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [qs, apiFetch]);

  useEffect(() => {
    if (!isReady) return;
    fetchAll();
  }, [fetchAll, isReady]);

  function handleDateChange(newFrom: string, newTo: string) {
    setFrom(newFrom);
    setTo(newTo);
  }

  if (loading) return <p className="text-muted-foreground">Loading reports...</p>;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <DateRangePicker onChange={handleDateChange} />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{dashboard.totalLeads}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">New This Week</p>
                <p className="text-2xl font-bold">{dashboard.newLeadsThisWeek}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Conversion</p>
                <p className="text-2xl font-bold">{dashboard.conversionRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">
                  ₹{dashboard.revenue.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Follow-ups Today</p>
                <p className="text-2xl font-bold">{dashboard.followUpsDueToday}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">WA Chats</p>
                <p className="text-2xl font-bold">{dashboard.activeConversations}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Lead Trend</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportToCSV(leadTrend, "lead-trend", [
                    { key: "date", label: "Date" },
                    { key: "count", label: "Leads" },
                  ])
                }
              >
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={leadTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => v.slice(5)}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      fill="#3b82f680"
                      name="Leads"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.leadsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="status"
                        tickFormatter={(v) => STATUS_LABELS[v] || v}
                        fontSize={12}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip
                        formatter={(value) => [Number(value), "Leads"]}
                        labelFormatter={(l) => STATUS_LABELS[String(l)] || String(l)}
                      />
                      <Bar dataKey="count" name="Leads">
                        {dashboard.leadsByStatus.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads by Source</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.leadsBySource.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No source data available
                  </p>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboard.leadsBySource}
                          dataKey="count"
                          nameKey="source"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }: any) =>
                            `${name} ${((percent || 0) * 100).toFixed(0)}%`
                          }
                        >
                          {dashboard.leadsBySource.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Pipeline Tab */}
      {tab === "pipeline" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis
                      dataKey="stage"
                      type="category"
                      tickFormatter={(v) => STATUS_LABELS[v] || v}
                      width={100}
                      fontSize={12}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        Number(value),
                        String(name) === "count" ? "Leads" : String(name),
                      ]}
                      labelFormatter={(l) => STATUS_LABELS[String(l)] || String(l)}
                    />
                    <Bar dataKey="count" name="Leads">
                      {funnel.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {funnel.map((stage, i) =>
                  i > 0 ? (
                    <div
                      key={stage.stage}
                      className="text-center rounded-lg border px-4 py-2"
                    >
                      <p className="text-xs text-muted-foreground">
                        {STATUS_LABELS[funnel[i - 1].stage]} → {STATUS_LABELS[stage.stage]}
                      </p>
                      <p className="text-lg font-bold">{stage.conversionRate}%</p>
                    </div>
                  ) : null
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              {dealVelocity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Not enough data to calculate velocity
                </p>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left font-medium">Stage</th>
                      <th className="pb-2 text-right font-medium">Avg. Days</th>
                      <th className="pb-2 text-right font-medium">Lead Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealVelocity.map((d) => (
                      <tr key={d.stage} className="border-b">
                        <td className="py-2">{STATUS_LABELS[d.stage] || d.stage}</td>
                        <td className="py-2 text-right font-medium">{d.avgDays}</td>
                        <td className="py-2 text-right">{d.leadCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Tab */}
      {tab === "revenue" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No revenue data for this period
                </p>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => v.slice(5)}
                        fontSize={12}
                      />
                      <YAxis
                        fontSize={12}
                        tickFormatter={(v) =>
                          `₹${(v / 1000).toFixed(0)}k`
                        }
                      />
                      <Tooltip
                        formatter={(value) => [
                          `₹${Number(value).toLocaleString("en-IN")}`,
                          "Revenue",
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {dashboard && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Revenue (Period)</p>
                  <p className="text-2xl font-bold">
                    ₹{dashboard.revenue.toLocaleString("en-IN")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Revenue by Source</p>
                  {dashboard.leadsBySource.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">No data</p>
                  ) : (
                    <div className="mt-2 space-y-1">
                      {dashboard.leadsBySource.map((s) => (
                        <div key={s.source} className="flex justify-between text-sm">
                          <span>{s.source}</span>
                          <span className="font-medium">{s.count} leads</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Quotations Tab */}
      {tab === "quotations" && quotationAnalysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Quotations</p>
                <p className="text-2xl font-bold">{quotationAnalysis.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Acceptance Rate</p>
                <p className="text-2xl font-bold">{quotationAnalysis.acceptanceRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Average Value</p>
                <p className="text-2xl font-bold">
                  ₹{quotationAnalysis.averageValue.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ₹{quotationAnalysis.totalRevenue.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quotation Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {quotationAnalysis.statusBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No quotation data available
                </p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={quotationAnalysis.statusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }: any) =>
                          `${STATUS_LABELS[name] || name} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                      >
                        {quotationAnalysis.statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Tab */}
      {tab === "team" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rep Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {repStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No rep data available
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm mb-6">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-2 text-left font-medium">Name</th>
                        <th className="pb-2 text-right font-medium">Assigned</th>
                        <th className="pb-2 text-right font-medium">Followed Up</th>
                        <th className="pb-2 text-right font-medium">Converted</th>
                        <th className="pb-2 text-right font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repStats.map((rep) => (
                        <tr key={rep.id} className="border-b">
                          <td className="py-2">
                            <div>
                              <p className="font-medium">{rep.name}</p>
                              <p className="text-xs text-muted-foreground">{rep.email}</p>
                            </div>
                          </td>
                          <td className="py-2 text-right">{rep.leadsAssigned}</td>
                          <td className="py-2 text-right">{rep.followedUp}</td>
                          <td className="py-2 text-right">{rep.converted}</td>
                          <td className="py-2 text-right font-medium">{rep.conversionRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={repStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="leadsAssigned" name="Assigned" fill="#3b82f6" />
                        <Bar dataKey="converted" name="Converted" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
