import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table for authentication and profile
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscriptions table for Stripe subscription management
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripePriceId: text("stripe_price_id"),
  plan: text("plan").notNull().default("free"), // free, basic, pro, enterprise
  status: text("status").notNull().default("active"), // active, canceled, past_due
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Contact form submissions
export const contacts = pgTable("contacts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"), // new, read, replied
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Newsletter subscribers
export const newsletters = pgTable("newsletters", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  subscribed: boolean("subscribed").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payment history for tracking
export const payments = pgTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(), // succeeded, pending, failed
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Goals and tasks for tracking
export const goals = pgTable("goals", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // finance, health, productivity, learning
  targetDate: timestamp("target_date"),
  completed: boolean("completed").default(false),
  rewardPoints: integer("reward_points").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User rewards and achievements
export const rewards = pgTable("rewards", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  totalPoints: integer("total_points").default(0),
  level: integer("level").default(1),
  achievements: text("achievements").default('[]'), // JSON array of achievement IDs
  lastMilestone: text("last_milestone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Mini-games for cognitive improvement
export const minigames = pgTable("minigames", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  gameType: text("game_type").notNull(), // memory, logic, math, pattern
  score: integer("score").default(0),
  timeSpent: integer("time_spent").default(0), // seconds
  difficulty: text("difficulty").default("medium"), // easy, medium, hard
  completed: boolean("completed").default(false),
  pointsEarned: integer("points_earned").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  payments: many(payments),
  goals: many(goals),
  rewards: many(rewards),
  minigames: many(minigames),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
}));

export const rewardsRelations = relations(rewards, ({ one }) => ({
  user: one(users, {
    fields: [rewards.userId],
    references: [users.id],
  }),
}));

export const minigamesRelations = relations(minigames, ({ one }) => ({
  user: one(users, {
    fields: [minigames.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertNewsletterSchema = createInsertSchema(newsletters).omit({
  id: true,
  createdAt: true,
  subscribed: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
});

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true,
  createdAt: true,
});

export const insertMinigameSchema = createInsertSchema(minigames).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = typeof newsletters.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewards.$inferSelect;

export type InsertMinigame = z.infer<typeof insertMinigameSchema>;
export type Minigame = typeof minigames.$inferSelect;

// Pricing plans configuration
export const PRICING_PLANS = {
  basic: {
    name: "Basic",
    price: 29,
    priceId: "price_basic", // Will be replaced with actual Stripe price ID
    features: [
      "Finance tracking",
      "Up to 5 projects",
      "Basic analytics",
      "Email support",
      "Mobile app access"
    ]
  },
  pro: {
    name: "Pro",
    price: 79,
    priceId: "price_pro",
    features: [
      "Everything in Basic",
      "Unlimited projects",
      "Side hustle toolkit",
      "Advanced analytics",
      "Priority support",
      "Team collaboration",
      "Custom integrations"
    ],
    popular: true
  },
  enterprise: {
    name: "Enterprise",
    price: 199,
    priceId: "price_enterprise",
    features: [
      "Everything in Pro",
      "White-label options",
      "Dedicated account manager",
      "Custom workflows",
      "SLA guarantee",
      "On-premise deployment",
      "Advanced security",
      "API access"
    ]
  }
} as const;
