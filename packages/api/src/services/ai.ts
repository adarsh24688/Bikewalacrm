import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function isAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

interface LeadContext {
  name: string;
  status?: string;
  productInterest?: string[];
  source?: string;
  notes?: string;
  lastInteraction?: string;
}

export async function generateFollowUpMessage(
  context: LeadContext,
  actionType: string,
  customInstructions?: string
): Promise<string> {
  const ai = getClient();

  const channelHints: Record<string, string> = {
    send_whatsapp: "WhatsApp message (keep it short, conversational, informal)",
    send_email: "professional email (include a subject line on the first line)",
    create_followup: "follow-up task notes (action items, talking points)",
  };

  const systemPrompt = `You are an AI assistant for a CRM. Generate a ${
    channelHints[actionType] || "follow-up message"
  } for a sales follow-up.
Rules:
- Be concise, friendly, and action-oriented
- Reference specific details about the lead when available
- Do not include placeholder brackets — use actual values provided
- Output only the message text, no labels or explanations`;

  const userPrompt = `Lead details:
- Name: ${context.name}
- Status: ${context.status || "unknown"}
- Products of interest: ${context.productInterest?.join(", ") || "not specified"}
- Source: ${context.source || "unknown"}
- Notes: ${context.notes || "none"}
- Last interaction: ${context.lastInteraction || "none"}
${customInstructions ? `\nAdditional instructions: ${customInstructions}` : ""}

Generate the message.`;

  const response = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() || "Unable to generate message.";
}
