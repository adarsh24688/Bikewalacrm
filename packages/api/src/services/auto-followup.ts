import { prisma } from "../lib/prisma";
import { followUpQueue } from "../lib/queue";
import type { FollowUpRule, Lead } from "@prisma/client";

interface RuleEvent {
  leadId: string;
  eventType: "lead_created" | "status_changed";
  oldStatus?: string;
  newStatus?: string;
}

export async function evaluateRulesForEvent(event: RuleEvent) {
  const rules = await prisma.followUpRule.findMany({
    where: { isActive: true, triggerType: event.eventType },
  });

  if (rules.length === 0) return;

  const lead = await prisma.lead.findUnique({ where: { id: event.leadId } });
  if (!lead) return;

  for (const rule of rules) {
    if (!matchesConditions(rule, lead, event)) continue;

    const log = await prisma.autoFollowUpLog.create({
      data: {
        ruleId: rule.id,
        leadId: event.leadId,
        status: "queued",
      },
    });

    await followUpQueue.add(
      `rule-${rule.id}-lead-${event.leadId}` as string,
      {
        ruleId: rule.id,
        leadId: event.leadId,
        actionType: rule.actionType,
        messageTemplate: rule.messageTemplate,
        followUpType: rule.followUpType,
        logId: log.id,
      },
      {
        delay: rule.delayHours * 60 * 60 * 1000,
      }
    );
  }
}

function matchesConditions(
  rule: FollowUpRule,
  lead: Lead,
  event: RuleEvent
): boolean {
  if (event.eventType === "status_changed") {
    if (rule.fromStatus && rule.fromStatus !== event.oldStatus) return false;
    if (rule.toStatus && rule.toStatus !== event.newStatus) return false;
  }

  if (rule.conditions && typeof rule.conditions === "object") {
    const conditions = rule.conditions as Record<string, unknown>;
    for (const [key, value] of Object.entries(conditions)) {
      const leadValue = (lead as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        if (!value.includes(leadValue)) return false;
      } else if (leadValue !== value) {
        return false;
      }
    }
  }

  return true;
}
