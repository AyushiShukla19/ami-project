import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable } from "@workspace/db";
import { eq, count, avg, sql } from "drizzle-orm";
import {
  CreateLeadBody,
  GetLeadParams,
  UpdateLeadParams,
  UpdateLeadBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/leads", async (_req, res): Promise<void> => {
  const leads = await db.select().from(leadsTable).orderBy(leadsTable.createdAt);
  res.json(leads);
});

router.post("/leads", async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [lead] = await db.insert(leadsTable).values({
    name: parsed.data.name,
    phone: parsed.data.phone ?? null,
    language: parsed.data.language ?? "en",
    status: "cold",
    trustScore: 0,
    interestLevel: 0,
    emotionalEngagement: 0,
  }).returning();
  res.status(201).json(lead);
});

router.get("/leads/analytics/summary", async (_req, res): Promise<void> => {
  const [totals] = await db.select({
    total: count(),
  }).from(leadsTable);

  const [hot] = await db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.status, "hot"));
  const [warm] = await db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.status, "warm"));
  const [cold] = await db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.status, "cold"));
  const [avgs] = await db.select({
    avgTrustScore: avg(leadsTable.trustScore),
    avgInterestLevel: avg(leadsTable.interestLevel),
  }).from(leadsTable);

  const langRows = await db.select({
    language: leadsTable.language,
    count: count(),
  }).from(leadsTable).groupBy(leadsTable.language);

  const languageDistribution: Record<string, number> = {};
  for (const row of langRows) {
    languageDistribution[row.language] = Number(row.count);
  }

  res.json({
    total: Number(totals?.total ?? 0),
    hot: Number(hot?.count ?? 0),
    warm: Number(warm?.count ?? 0),
    cold: Number(cold?.count ?? 0),
    languageDistribution,
    avgTrustScore: Number(avgs?.avgTrustScore ?? 0),
    avgInterestLevel: Number(avgs?.avgInterestLevel ?? 0),
  });
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.id));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  res.json(lead);
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateLeadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.data.status !== undefined) updateData.status = body.data.status;
  if (body.data.language !== undefined) updateData.language = body.data.language;
  if (body.data.trustScore !== undefined) updateData.trustScore = body.data.trustScore;
  if (body.data.interestLevel !== undefined) updateData.interestLevel = body.data.interestLevel;
  if (body.data.emotionalEngagement !== undefined) updateData.emotionalEngagement = body.data.emotionalEngagement;
  if (body.data.objectionsRaised !== undefined) updateData.objectionsRaised = body.data.objectionsRaised;
  if (body.data.recommendation !== undefined) updateData.recommendation = body.data.recommendation;
  if (body.data.conversationId !== undefined) updateData.conversationId = body.data.conversationId;

  const [lead] = await db.update(leadsTable).set(updateData).where(eq(leadsTable.id, params.data.id)).returning();
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  res.json(lead);
});

export default router;
