"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface OwnerDashboardData {
  leads: {
    today: number;
    yesterday: number;
    month: number;
    todayByStatus: Array<{ status: string; count: number }>;
  };
  conversion: {
    today: { won: number; lost: number; rate: number };
    yesterday: { won: number; lost: number; rate: number };
    month: { won: number; lost: number; rate: number };
  };
  revenue: {
    today: number;
    yesterday: number;
    month: number;
  };
  followUps: {
    today: { scheduled: number; completed: number; missed: number; completionRate: number };
    yesterday: { scheduled: number; completed: number; missed: number; completionRate: number };
    month: { scheduled: number; completed: number; missed: number; completionRate: number };
  };
  repPerformance: Array<{
    id: string;
    name: string;
    today: { newLeads: number; followUpsCompleted: number; conversions: number };
    month: { newLeads: number; followUpsCompleted: number; conversions: number; conversionRate: number };
  }>;
  leadsBySource: Array<{ source: string; count: number }>;
}

const COLORS = ["#3b82f6", "#f59e0b", "#f97316", "#8b5cf6", "#6366f1", "#22c55e", "#ef4444", "#14b8a6"];

function DeltaIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : diff > 0 ? 100 : 0;
  if (diff === 0) return <span className="text-xs text-muted-foreground">no change</span>;
  const isUp = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-green-600" : "text-red-600"}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? "+" : ""}{pct}%
    </span>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className="h-2 rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-1 h-4 w-48" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="mb-1 h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Follow-up Accountability */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rep Scorecard */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { fetch: apiFetch, isReady, session } = useApi();
  const router = useRouter();
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const role = (session as any)?.user?.role as string | undefined;
  const userName = (session as any)?.user?.name as string | undefined;

  useEffect(() => {
    if (role === "sales_rep" || role === "frontdesk") {
      router.replace("/leads");
    }
  }, [role, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<OwnerDashboardData>("/reports/owner-dashboard");
      setData(result);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!isReady) return;
    if (role === "sales_rep" || role === "frontdesk") return;
    fetchData();
  }, [fetchData, isReady, role]);

  if (role === "sales_rep" || role === "frontdesk") return null;
  if (loading) return <DashboardSkeleton />;
  if (!data) return <p className="text-muted-foreground">Failed to load dashboard.</p>;

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const comparisonData = [
    { name: "Leads", today: data.leads.today, yesterday: data.leads.yesterday },
    { name: "Conversions", today: data.conversion.today.won, yesterday: data.conversion.yesterday.won },
    { name: "Follow-ups", today: data.followUps.today.completed, yesterday: data.followUps.yesterday.completed },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{getGreeting()}, {userName?.split(" ")[0] || "there"}</h1>
        <p className="text-sm text-muted-foreground">{todayStr}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* New Leads */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <p className="text-sm">New Leads</p>
            </div>
            <p className="text-2xl font-bold">{data.leads.today}</p>
            <div className="flex items-center justify-between mt-1">
              <DeltaIndicator current={data.leads.today} previous={data.leads.yesterday} />
              <span className="text-xs text-muted-foreground">MTD: {data.leads.month}</span>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <p className="text-sm">Conversion Rate</p>
            </div>
            <p className="text-2xl font-bold">{data.conversion.today.rate}%</p>
            <div className="flex items-center justify-between mt-1">
              <DeltaIndicator current={data.conversion.today.rate} previous={data.conversion.yesterday.rate} />
              <span className="text-xs text-muted-foreground">MTD: {data.conversion.month.rate}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <IndianRupee className="h-4 w-4" />
              <p className="text-sm">Revenue</p>
            </div>
            <p className="text-2xl font-bold">
              {"\u20B9"}{data.revenue.today.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center justify-between mt-1">
              <DeltaIndicator current={data.revenue.today} previous={data.revenue.yesterday} />
              <span className="text-xs text-muted-foreground">MTD: {"\u20B9"}{data.revenue.month.toLocaleString("en-IN")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Follow-ups Done */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm">Follow-ups Done</p>
            </div>
            <p className="text-2xl font-bold">
              {data.followUps.today.completed}/{data.followUps.today.scheduled}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">{data.followUps.today.completionRate}% done</span>
              <span className="text-xs text-muted-foreground">MTD: {data.followUps.month.completionRate}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up Accountability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-up Accountability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Today", stats: data.followUps.today },
            { label: "Yesterday", stats: data.followUps.yesterday },
            { label: "This Month", stats: data.followUps.month },
          ].map(({ label, stats }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-muted-foreground">
                  {stats.completed}/{stats.scheduled} completed — {stats.completionRate}%
                </span>
              </div>
              <ProgressBar value={stats.completed} max={stats.scheduled} />
            </div>
          ))}

          {data.followUps.today.missed > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {data.followUps.today.missed} follow-up{data.followUps.today.missed > 1 ? "s" : ""} missed today.{" "}
                <Link href="/follow-ups" className="underline font-medium">
                  View follow-ups
                </Link>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rep Scorecard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rep Scorecard</CardTitle>
        </CardHeader>
        <CardContent>
          {data.repPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No rep data available</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left font-medium">Name</th>
                      <th className="pb-2 text-right font-medium">New Leads (Today)</th>
                      <th className="pb-2 text-right font-medium">Follow-ups Done (Today)</th>
                      <th className="pb-2 text-right font-medium">Conversions (Today)</th>
                      <th className="pb-2 text-right font-medium">Month Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.repPerformance.map((rep) => (
                      <tr key={rep.id} className="border-b">
                        <td className="py-2 font-medium">{rep.name}</td>
                        <td className="py-2 text-right">{rep.today.newLeads}</td>
                        <td className="py-2 text-right">{rep.today.followUpsCompleted}</td>
                        <td className="py-2 text-right">{rep.today.conversions}</td>
                        <td className="py-2 text-right font-medium">{rep.month.conversionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {data.repPerformance.map((rep) => (
                  <div key={rep.id} className="rounded-lg border p-3">
                    <p className="font-medium mb-2">{rep.name}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Leads Today</p>
                        <p className="font-medium">{rep.today.newLeads}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Follow-ups</p>
                        <p className="font-medium">{rep.today.followUpsCompleted}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversions</p>
                        <p className="font-medium">{rep.today.conversions}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Month Rate</p>
                        <p className="font-medium">{rep.month.conversionRate}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Leads by Source - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Source (Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.leadsBySource.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No source data available</p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.leadsBySource}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }: any) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      {data.leadsBySource.map((_, i) => (
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

        {/* Today vs Yesterday - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today vs Yesterday</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="today" name="Today" fill="#3b82f6" />
                  <Bar dataKey="yesterday" name="Yesterday" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
