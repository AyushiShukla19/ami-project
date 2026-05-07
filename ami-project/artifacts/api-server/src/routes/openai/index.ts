import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const AMI_SYSTEM_PROMPT = `You are Ami, an AI-powered relationship manager for Rupeezy's Authorized Person (AP) partner program. Your name means "friend" in French.

Your personality:
- Warm, conversational, emotionally intelligent
- Professional but friendly, never robotic
- Culturally adaptive and multilingual
- Give short, natural responses — avoid long paragraphs
- Ask natural follow-up questions
- React empathetically to concerns
- Never use emojis in any response

Your purpose:
- Guide potential partners through Rupeezy's AP program
- Answer questions about earnings (up to 100% brokerage sharing, daily payouts), onboarding, support
- Handle objections naturally and persuasively
- Qualify leads as Hot, Warm, or Cold based on engagement
- Build trust and eventually suggest connecting with a human RM

When handling objections:
- "Already with another broker": "That's great — since you already understand the business, are you currently getting 100% brokerage sharing and daily payouts?"
- "No clients yet": "That's actually the best time to start — we provide marketing support and training. What's your target area?"
- "Trust issues": Share Rupeezy's SEBI registration, track record, and testimonials

Language rules:
- Respond in the language the user is communicating in
- If language hint is provided, adapt to it: "en"=English, "hi"=Hindi, "hinglish"=Hinglish mix, "mr"=Marathi
- If user switches language mid-conversation, adapt naturally

Always end responses with a gentle question to keep the conversation flowing.`;

const LEAD_ANALYSIS_PROMPT = `You are a lead qualification analyst for Rupeezy's AP partner program.

Analyze the conversation between Ami (AI) and the potential partner, then return a JSON object with these exact fields:
{
  "status": "hot" | "warm" | "cold",
  "trustScore": 0-100,
  "interestLevel": 0-100,
  "emotionalEngagement": 0-100,
  "objectionsRaised": "brief summary of objections or null",
  "recommendation": "one sentence recommendation for next step",
  "requestedRm": true | false
}

Scoring rules:
- "hot": Person is clearly ready to join, excited, asking about next steps, saying they want to work/join (interestLevel 70+, trustScore 65+)
- "warm": Person is interested but has questions or hesitations (interestLevel 40-70, trustScore 40-65)
- "cold": Person is skeptical, disengaged, or just browsing (interestLevel below 40)

Key signals for "hot":
- Says "I want to work", "I want to join", "how do I start", "sign me up", "interested"
- Asks about specific earning amounts or timelines
- Shares personal details suggesting commitment

Key signals for "warm":
- Asks clarifying questions about the program
- Shows interest but has concerns about trust, competition, or experience
- Engaged in conversation but not yet committed

Key signals for "cold":
- Dismissive, skeptical, or one-word answers
- Expresses strong doubt or lack of interest
- No follow-up questions

Set "requestedRm" to true if the person explicitly asked to speak with a human, an RM, or a real person at any point in the conversation (e.g. "connect me to someone", "I want to talk to a human", "speak to RM", "call me", "human support"). Otherwise false.

Return ONLY valid JSON, no explanation.`;

router.get("/conversations", async (req, res): Promise<void> => {
  const allConversations = await db.select().from(conversations).orderBy(conversations.createdAt);
  res.json(allConversations);
});

router.post("/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conv] = await db.insert(conversations).values({ title: parsed.data.title }).returning();
  res.status(201).json(conv);
});

router.get("/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, params.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db.delete(conversations).where(eq(conversations.id, params.data.id)).returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SendOpenaiMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { id } = params.data;
  const { content, language } = body.data;

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({ conversationId: id, role: "user", content });

  const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);

  const langHint = language ? ` (User's preferred language: ${language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : language === "hinglish" ? "Hinglish" : "English"})` : "";

  const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: AMI_SYSTEM_PROMPT + langHint },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  // Stream Ami's conversational response
  const stream = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 8192,
    messages: chatMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullResponse += delta;
      res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
    }
  }

  await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });

  // Analyze the full conversation to determine lead quality
  const conversationText = history
    .map((m) => `${m.role === "user" ? "Partner" : "Ami"}: ${m.content}`)
    .join("\n") + `\nPartner: ${content}\nAmi: ${fullResponse}`;

  try {
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: LEAD_ANALYSIS_PROMPT },
        { role: "user", content: `Analyze this conversation:\n\n${conversationText}` },
      ],
      stream: false,
    });

    const analysisText = analysisResponse.choices[0]?.message?.content ?? "{}";
    // Extract JSON from the response (handle any surrounding text)
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const leadAnalysis = JSON.parse(jsonMatch[0]);
      res.write(`data: ${JSON.stringify({ leadAnalysis })}\n\n`);
    }
  } catch {
    // If analysis fails, don't block — just skip it
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
