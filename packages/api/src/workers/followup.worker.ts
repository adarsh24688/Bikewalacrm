import { Worker, Job, type ConnectionOptions } from "bullmq";
import { redis } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { logActivity } from "../services/activity";
import type { FollowUpJobData } from "../lib/queue";

function interpolateTemplate(
  template: string,
  lead: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key === "product_interest" && Array.isArray(lead.productInterest)) {
      return (lead.productInterest as string[]).join(", ");
    }
    return String(lead[key] ?? "");
  });
}

async function processJob(job: Job<FollowUpJobData>) {
  const { ruleId, leadId, actionType, messageTemplate, followUpType, logId } =
    job.data;

  await prisma.autoFollowUpLog.update({
    where: { id: logId },
    data: { status: "processing" },
  });

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    await prisma.autoFollowUpLog.update({
      where: { id: logId },
      data: { status: "failed", errorMessage: "Lead not found", executedAt: new Date() },
    });
    return;
  }

  const message = messageTemplate
    ? interpolateTemplate(messageTemplate, lead as unknown as Record<string, unknown>)
    : undefined;

  try {
    switch (actionType) {
      case "create_followup": {
        await prisma.followUp.create({
          data: {
            leadId,
            scheduledAt: new Date(),
            type: (followUpType as any) || "call",
            notes: message || `Auto follow-up from rule`,
            createdBy: "system",
          },
        });
        await logActivity({
          leadId,
          type: "auto_followup_created",
          description: `Auto follow-up task created by rule`,
          performedBy: "system",
          metadata: { ruleId, automated: true },
        });
        break;
      }

      case "send_whatsapp": {
        if (!lead.phone) throw new Error("Lead has no phone number");
        await prisma.waMessage.create({
          data: {
            direction: "outbound",
            fromNumber: "system",
            toNumber: lead.phone,
            body: message || "Hello! Following up on your inquiry.",
            status: "pending",
            leadId,
            isAutomated: true,
          },
        });
        await logActivity({
          leadId,
          type: "auto_whatsapp_sent",
          description: `Automated WhatsApp message queued`,
          performedBy: "system",
          metadata: { ruleId, automated: true },
        });
        break;
      }

      case "send_email": {
        await logActivity({
          leadId,
          type: "auto_email_queued",
          description: `Automated email queued: ${message?.substring(0, 100) || "Follow-up email"}`,
          performedBy: "system",
          metadata: { ruleId, automated: true, emailBody: message },
        });
        break;
      }
    }

    await prisma.autoFollowUpLog.update({
      where: { id: logId },
      data: { status: "completed", executedAt: new Date() },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await prisma.autoFollowUpLog.update({
      where: { id: logId },
      data: { status: "failed", errorMessage, executedAt: new Date() },
    });
    throw err;
  }
}

export function startFollowUpWorker() {
  const worker = new Worker<FollowUpJobData>(
    "follow-up-actions",
    processJob,
    { connection: redis as unknown as ConnectionOptions, concurrency: 5 }
  );

  worker.on("completed", (job) => {
    console.log(`Follow-up job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Follow-up job ${job?.id} failed:`, err.message);
  });

  console.log("Follow-up worker started");
  return worker;
}
