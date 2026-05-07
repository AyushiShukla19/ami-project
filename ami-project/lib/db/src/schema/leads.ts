import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  language: text("language").notNull().default("en"),
  status: text("status").notNull().default("cold"),
  trustScore: integer("trust_score").notNull().default(0),
  interestLevel: integer("interest_level").notNull().default(0),
  emotionalEngagement: integer("emotional_engagement").notNull().default(0),
  objectionsRaised: text("objections_raised"),
  recommendation: text("recommendation"),
  requestedRm: boolean("requested_rm").notNull().default(false),
  conversationId: integer("conversation_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;

