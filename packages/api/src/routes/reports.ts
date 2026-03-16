import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, scopeToUser } from "../middleware/auth";

function buildDateFilter(from?: string, to?: string, period?: string) {
  if (from || to) {
    const filter: Record<string, Date> = {};
    if (from) filter.gte = new Date(from);
    if (to) filter.lte = new Date(to);
    return filter;
  }
  const since = new Date();
  since.setDate(since.getDate() - Number(period || 30));
  return { gte: since };
}

export async function reportRoutes(app: FastifyInstance) {
  // GET /reports/dashboard
  app.get("/reports/dashboard", { preHandler: [requireAuth] }, async (request) => {
    const { period = "30", from, to } = request.query as { period?: string; from?: string; to?: string };
    const scopedUser = scopeToUser(request);

    const leadFilter = scopedUser ? { assignedTo: scopedUser } : {};
    const dateFilter = { createdAt: buildDateFilter(from, to, period) };

    const [
      totalLeads,
      newLeadsThisWeek,
      wonLeads,
      totalLeadsForConversion,
      followUpsDueToday,
      activeConversations,
      leadsByStatus,
      leadsBySource,
    ] = await Promise.all([
      // Total leads this period
      prisma.lead.count({ where: { ...leadFilter, ...dateFilter } as any }),

      // New leads this week
      (() => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return prisma.lead.count({
          where: { ...leadFilter, createdAt: { gte: weekAgo } } as any,
        });
      })(),

      // Won leads
      prisma.lead.count({
        where: { ...leadFilter, status: "won", ...dateFilter } as any,
      }),

      // Total leads for conversion rate
      prisma.lead.count({
        where: {
          ...leadFilter,
          status: { in: ["won", "lost"] },
          ...dateFilter,
        } as any,
      }),

      // Follow-ups due today
      (() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        return prisma.followUp.count({
          where: {
            status: "scheduled",
            scheduledAt: { gte: todayStart, lt: todayEnd },
            ...(scopedUser ? { lead: { assignedTo: scopedUser } } : {}),
          } as any,
        });
      })(),

      // Active WA conversations
      prisma.waConversation.count({
        where: {
          isArchived: false,
          ...(scopedUser ? { assignedTo: scopedUser } : {}),
        } as any,
      }),

      // Leads by status
      prisma.lead.groupBy({
        by: ["status"],
        _count: true,
        where: { ...leadFilter, ...dateFilter } as any,
      }),

      // Leads by source
      prisma.lead.groupBy({
        by: ["source"],
        _count: true,
        where: { ...leadFilter, ...dateFilter, source: { not: null } } as any,
      }),
    ]);

    const conversionRate =
      totalLeadsForConversion > 0
        ? ((wonLeads / totalLeadsForConversion) * 100).toFixed(1)
        : "0";

    // Revenue from won quotations
    const revenue = await prisma.quotation.aggregate({
      _sum: { total: true },
      where: {
        lead: { status: "won", ...leadFilter },
        ...dateFilter,
      } as any,
    });

    return {
      totalLeads,
      newLeadsThisWeek,
      conversionRate: Number(conversionRate),
      revenue: Number(revenue._sum.total || 0),
      followUpsDueToday,
      activeConversations,
      leadsByStatus: leadsByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      leadsBySource: leadsBySource.map((s) => ({
        source: s.source || "Unknown",
        count: s._count,
      })),
    };
  });

  // GET /reports/owner-dashboard — daily control panel for owners
  app.get(
    "/reports/owner-dashboard",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Batch 1: Lead counts + conversions (10 queries, single connection)
      const [
        leadsToday, leadsYesterday, leadsMonth, leadsByStatusToday,
        wonToday, lostToday, wonYesterday, lostYesterday, wonMonth, lostMonth,
      ] = await prisma.$transaction([
        prisma.lead.count({ where: { createdAt: { gte: todayStart, lt: todayEnd } } }),
        prisma.lead.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
        prisma.lead.count({ where: { createdAt: { gte: monthStart } } }),
        prisma.lead.groupBy({ by: ["status"], _count: true, orderBy: { _count: { status: "desc" } }, where: { createdAt: { gte: todayStart, lt: todayEnd } } }),
        prisma.lead.count({ where: { status: "won", updatedAt: { gte: todayStart, lt: todayEnd } } }),
        prisma.lead.count({ where: { status: "lost", updatedAt: { gte: todayStart, lt: todayEnd } } }),
        prisma.lead.count({ where: { status: "won", updatedAt: { gte: yesterdayStart, lt: todayStart } } }),
        prisma.lead.count({ where: { status: "lost", updatedAt: { gte: yesterdayStart, lt: todayStart } } }),
        prisma.lead.count({ where: { status: "won", updatedAt: { gte: monthStart } } }),
        prisma.lead.count({ where: { status: "lost", updatedAt: { gte: monthStart } } }),
      ]);

      // Batch 2: Revenue + follow-ups + leads by source (13 queries, single connection)
      const [
        revenueToday, revenueYesterday, revenueMonth,
        fuTodayScheduled, fuTodayCompleted, fuTodayMissed,
        fuYesterdayScheduled, fuYesterdayCompleted, fuYesterdayMissed,
        fuMonthScheduled, fuMonthCompleted, fuMonthMissed,
        leadsBySource,
      ] = await prisma.$transaction([
        prisma.quotation.aggregate({ _sum: { total: true }, where: { status: "accepted", updatedAt: { gte: todayStart, lt: todayEnd } } as any }),
        prisma.quotation.aggregate({ _sum: { total: true }, where: { status: "accepted", updatedAt: { gte: yesterdayStart, lt: todayStart } } as any }),
        prisma.quotation.aggregate({ _sum: { total: true }, where: { status: "accepted", updatedAt: { gte: monthStart } } as any }),
        prisma.followUp.count({ where: { scheduledAt: { gte: todayStart, lt: todayEnd } } }),
        prisma.followUp.count({ where: { scheduledAt: { gte: todayStart, lt: todayEnd }, status: "completed" } }),
        prisma.followUp.count({ where: { scheduledAt: { gte: todayStart, lt: todayEnd }, status: "missed" } }),
        prisma.followUp.count({ where: { scheduledAt: { gte: yesterdayStart, lt: todayStart } } }),
        prisma.followUp.count({ where: { scheduledAt: { gte: yesterdayStart, lt: todayStart }, status: "completed" } }),
        prisma.followUp.count({ where: { scheduledAt: { gte: yesterdayStart, lt: todayStart }, status: "missed" } }),
        prisma.followUp.count({ where: { scheduledAt: { gte: monthStart } } }),
        prisma.followUp.count({ where: { scheduledAt: { gte: monthStart }, status: "completed" } }),
        prisma.followUp.count({ where: { scheduledAt: { gte: monthStart }, status: "missed" } }),
        prisma.lead.groupBy({ by: ["source"], _count: true, orderBy: { _count: { source: "desc" } }, where: { createdAt: { gte: monthStart }, source: { not: null } } as any }),
      ]);

      // Batch 3: Rep performance (sequential per rep to avoid pool exhaustion)
      const reps = await prisma.allowedUser.findMany({
        where: { role: { in: ["sales_rep", "manager"] }, isActive: true },
        include: { profile: true },
      });

      const repPerformance = [];
      for (const rep of reps) {
        const [newLeadsToday, fuCompletedToday, convToday, newLeadsM, fuCompletedM, convM, totalDecidedM] =
          await prisma.$transaction([
            prisma.lead.count({ where: { assignedTo: rep.id, createdAt: { gte: todayStart, lt: todayEnd } } }),
            prisma.followUp.count({ where: { createdBy: rep.id, status: "completed", scheduledAt: { gte: todayStart, lt: todayEnd } } }),
            prisma.lead.count({ where: { assignedTo: rep.id, status: "won", updatedAt: { gte: todayStart, lt: todayEnd } } }),
            prisma.lead.count({ where: { assignedTo: rep.id, createdAt: { gte: monthStart } } }),
            prisma.followUp.count({ where: { createdBy: rep.id, status: "completed", scheduledAt: { gte: monthStart } } }),
            prisma.lead.count({ where: { assignedTo: rep.id, status: "won", updatedAt: { gte: monthStart } } }),
            prisma.lead.count({ where: { assignedTo: rep.id, status: { in: ["won", "lost"] }, updatedAt: { gte: monthStart } } as any }),
          ]);

        repPerformance.push({
          id: rep.id,
          name: rep.profile?.name || rep.email,
          today: { newLeads: newLeadsToday, followUpsCompleted: fuCompletedToday, conversions: convToday },
          month: {
            newLeads: newLeadsM,
            followUpsCompleted: fuCompletedM,
            conversions: convM,
            conversionRate: totalDecidedM > 0 ? Number(((convM / totalDecidedM) * 100).toFixed(1)) : 0,
          },
        });
      }

      const convRate = (won: number, lost: number) => {
        const total = won + lost;
        return total > 0 ? Number(((won / total) * 100).toFixed(1)) : 0;
      };

      const fuStats = (scheduled: number, completed: number, missed: number) => ({
        scheduled,
        completed,
        missed,
        completionRate: scheduled > 0 ? Number(((completed / scheduled) * 100).toFixed(1)) : 0,
      });

      return {
        leads: {
          today: leadsToday,
          yesterday: leadsYesterday,
          month: leadsMonth,
          todayByStatus: leadsByStatusToday.map((s) => ({ status: s.status, count: s._count })),
        },
        conversion: {
          today: { won: wonToday, lost: lostToday, rate: convRate(wonToday, lostToday) },
          yesterday: { won: wonYesterday, lost: lostYesterday, rate: convRate(wonYesterday, lostYesterday) },
          month: { won: wonMonth, lost: lostMonth, rate: convRate(wonMonth, lostMonth) },
        },
        revenue: {
          today: Number(revenueToday._sum.total || 0),
          yesterday: Number(revenueYesterday._sum.total || 0),
          month: Number(revenueMonth._sum.total || 0),
        },
        followUps: {
          today: fuStats(fuTodayScheduled, fuTodayCompleted, fuTodayMissed),
          yesterday: fuStats(fuYesterdayScheduled, fuYesterdayCompleted, fuYesterdayMissed),
          month: fuStats(fuMonthScheduled, fuMonthCompleted, fuMonthMissed),
        },
        repPerformance,
        leadsBySource: leadsBySource.map((s) => ({ source: s.source || "Unknown", count: s._count })),
      };
    }
  );

  // GET /reports/reps — rep performance
  app.get(
    "/reports/reps",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request) => {
      const { period = "30" } = request.query as { period?: string };
      const since = new Date();
      since.setDate(since.getDate() - Number(period));

      const reps = await prisma.allowedUser.findMany({
        where: { role: { in: ["sales_rep", "manager"] }, isActive: true },
        include: { profile: true },
      });

      const repStats = await Promise.all(
        reps.map(async (rep) => {
          const [assigned, followedUp, converted] = await Promise.all([
            prisma.lead.count({
              where: { assignedTo: rep.id, createdAt: { gte: since } },
            }),
            prisma.followUp.count({
              where: {
                createdBy: rep.id,
                status: "completed",
                createdAt: { gte: since },
              },
            }),
            prisma.lead.count({
              where: { assignedTo: rep.id, status: "won", createdAt: { gte: since } },
            }),
          ]);

          return {
            id: rep.id,
            name: rep.profile?.name || rep.email,
            email: rep.email,
            leadsAssigned: assigned,
            followedUp,
            converted,
            conversionRate: assigned > 0 ? ((converted / assigned) * 100).toFixed(1) : "0",
          };
        })
      );

      return repStats;
    }
  );

  // GET /reports/leads — lead trend data
  app.get("/reports/leads", { preHandler: [requireAuth] }, async (request) => {
    const { period = "30" } = request.query as { period?: string };
    const scopedUser = scopeToUser(request);
    const days = Number(period);

    const trend: { date: string; count: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await prisma.lead.count({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
          ...(scopedUser ? { assignedTo: scopedUser } : {}),
        } as any,
      });

      trend.push({ date: dayStart.toISOString().split("T")[0], count });
    }

    return trend;
  });

  // GET /reports/products
  app.get("/reports/products", { preHandler: [requireAuth] }, async () => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    const stats = await Promise.all(
      products.map(async (p) => {
        const leadCount = await prisma.lead.count({
          where: { productInterest: { has: p.name } },
        });
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          leadCount,
        };
      })
    );

    return stats;
  });

  // GET /reports/pipeline-funnel
  app.get("/reports/pipeline-funnel", { preHandler: [requireAuth] }, async (request) => {
    const { period = "30", from, to } = request.query as { period?: string; from?: string; to?: string };
    const scopedUser = scopeToUser(request);
    const dateFilter = buildDateFilter(from, to, period);
    const leadFilter = scopedUser ? { assignedTo: scopedUser } : {};

    const stages = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won"] as const;

    const counts = await Promise.all(
      stages.map((status) =>
        prisma.lead.count({
          where: { ...leadFilter, status, createdAt: dateFilter } as any,
        })
      )
    );

    const funnel = stages.map((stage, i) => ({
      stage,
      count: counts[i],
      conversionRate:
        i === 0
          ? 100
          : counts[i - 1] > 0
          ? Number(((counts[i] / counts[i - 1]) * 100).toFixed(1))
          : 0,
    }));

    return funnel;
  });

  // GET /reports/revenue-trend
  app.get("/reports/revenue-trend", { preHandler: [requireAuth] }, async (request) => {
    const { period = "30", from, to } = request.query as { period?: string; from?: string; to?: string };
    const dateFilter = buildDateFilter(from, to, period);
    const since = dateFilter.gte || new Date(Date.now() - 30 * 86400000);

    const quotations = await prisma.quotation.findMany({
      where: {
        status: { in: ["accepted", "sent"] },
        createdAt: { gte: since, ...(dateFilter.lte ? { lte: dateFilter.lte } : {}) },
      } as any,
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const grouped: Record<string, number> = {};
    for (const q of quotations) {
      const key = q.createdAt.toISOString().split("T")[0];
      grouped[key] = (grouped[key] || 0) + Number(q.total);
    }

    const trend = Object.entries(grouped).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    return trend;
  });

  // GET /reports/quotation-analysis
  app.get("/reports/quotation-analysis", { preHandler: [requireAuth] }, async (request) => {
    const { period = "30", from, to } = request.query as { period?: string; from?: string; to?: string };
    const dateFilter = buildDateFilter(from, to, period);

    const quotations = await prisma.quotation.findMany({
      where: { createdAt: dateFilter } as any,
      select: { status: true, total: true },
    });

    const total = quotations.length;
    const statusBreakdown: Record<string, number> = {};
    let totalRevenue = 0;
    let totalValue = 0;
    let sentCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;

    for (const q of quotations) {
      statusBreakdown[q.status] = (statusBreakdown[q.status] || 0) + 1;
      totalValue += Number(q.total);
      if (q.status === "accepted") {
        totalRevenue += Number(q.total);
        acceptedCount++;
      }
      if (q.status === "sent") sentCount++;
      if (q.status === "rejected") rejectedCount++;
    }

    const decisionCount = sentCount + acceptedCount + rejectedCount;
    const acceptanceRate =
      decisionCount > 0
        ? Number(((acceptedCount / decisionCount) * 100).toFixed(1))
        : 0;

    return {
      total,
      statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({
        status,
        count,
      })),
      acceptanceRate,
      averageValue: total > 0 ? Number((totalValue / total).toFixed(2)) : 0,
      totalRevenue,
    };
  });

  // GET /reports/deal-velocity
  app.get("/reports/deal-velocity", { preHandler: [requireAuth] }, async (request) => {
    const { period = "90", from, to } = request.query as { period?: string; from?: string; to?: string };
    const dateFilter = buildDateFilter(from, to, period);

    const stages = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won"];

    const statusChanges = await prisma.activity.findMany({
      where: {
        type: "status_changed",
        createdAt: dateFilter,
      } as any,
      select: { leadId: true, metadata: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const leadTimelines: Record<string, { status: string; at: Date }[]> = {};
    for (const sc of statusChanges) {
      const meta = sc.metadata as Record<string, string> | null;
      if (!meta?.to) continue;
      if (!leadTimelines[sc.leadId]) leadTimelines[sc.leadId] = [];
      leadTimelines[sc.leadId].push({ status: meta.to, at: sc.createdAt });
    }

    const stageDurations: Record<string, number[]> = {};
    for (const stage of stages) stageDurations[stage] = [];

    for (const events of Object.values(leadTimelines)) {
      for (let i = 0; i < events.length - 1; i++) {
        const days =
          (events[i + 1].at.getTime() - events[i].at.getTime()) / 86400000;
        if (stageDurations[events[i].status]) {
          stageDurations[events[i].status].push(days);
        }
      }
    }

    const velocity = stages.map((stage) => {
      const durations = stageDurations[stage];
      const avg =
        durations.length > 0
          ? Number(
              (durations.reduce((s, d) => s + d, 0) / durations.length).toFixed(1)
            )
          : 0;
      return { stage, avgDays: avg, leadCount: durations.length };
    });

    return velocity;
  });
}
