import { sendText } from "./sendText";
import { prisma } from "../lib/prisma";

export async function generateAndSendDailyReport(recipientNumbers: string[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [newLeads, followUpsCompleted, quotationsSent, dealsWon] =
    await Promise.all([
      prisma.lead.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.followUp.count({
        where: {
          status: "completed",
          completedAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.quotation.count({
        where: {
          sharedAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.lead.count({
        where: {
          status: "won",
          updatedAt: { gte: today, lt: tomorrow },
        },
      }),
    ]);

  const dateStr = today.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const message = `*Yash CRM Daily Report*
${dateStr}

*New Leads:* ${newLeads}
*Follow-ups Completed:* ${followUpsCompleted}
*Quotations Sent:* ${quotationsSent}
*Deals Won:* ${dealsWon}

_Automated report from Yash CRM_`;

  for (const number of recipientNumbers) {
    try {
      await sendText(number, message);

      // Log as automated message
      await prisma.waMessage.create({
        data: {
          direction: "outbound",
          fromNumber: "self",
          toNumber: number,
          body: message,
          status: "sent",
          isAutomated: true,
          timestamp: new Date(),
        },
      });
    } catch (err) {
      console.error(`Failed to send report to ${number}:`, err);
    }
  }
}
