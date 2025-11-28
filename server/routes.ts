// API routes for LifeSync Pro
// Reference: stripe blueprint, javascript_database blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { insertContactSchema, insertNewsletterSchema, PRICING_PLANS } from "@shared/schema";
import { generateAIResponse, generateGoalRecommendations, generateFinancialInsights } from "./aiClient";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get Stripe publishable key for frontend
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  // Create checkout session for subscription
  app.post("/api/checkout", async (req, res) => {
    try {
      const { priceId, plan, email } = req.body;
      
      if (!priceId || !plan) {
        return res.status(400).json({ error: "Price ID and plan are required" });
      }

      const stripe = await getUncachableStripeClient();
      const host = req.headers.host || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const baseUrl = `${protocol}://${host}`;

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/payment/cancel`,
        customer_email: email,
        metadata: {
          plan: plan,
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  // Get checkout session status
  app.get("/api/checkout/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      res.json({
        status: session.status,
        customerEmail: session.customer_email,
        subscriptionId: session.subscription,
        plan: session.metadata?.plan,
      });
    } catch (error: any) {
      console.error("Session retrieval error:", error);
      res.status(500).json({ error: "Failed to retrieve session" });
    }
  });

  // Customer portal session
  app.post("/api/customer-portal", async (req, res) => {
    try {
      const { customerId } = req.body;
      
      if (!customerId) {
        return res.status(400).json({ error: "Customer ID is required" });
      }

      const stripe = await getUncachableStripeClient();
      const host = req.headers.host || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const baseUrl = `${protocol}://${host}`;

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/dashboard`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Customer portal error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // Get pricing plans (static configuration)
  app.get("/api/pricing", async (req, res) => {
    try {
      // First try to get products from Stripe
      const products = await storage.listStripeProductsWithPrices(true);
      
      if (products && products.length > 0) {
        // Group products with their prices
        const productsMap = new Map();
        for (const row of products) {
          if (!productsMap.has(row.product_id)) {
            productsMap.set(row.product_id, {
              id: row.product_id,
              name: row.product_name,
              description: row.product_description,
              metadata: row.product_metadata,
              prices: []
            });
          }
          if (row.price_id) {
            productsMap.get(row.product_id).prices.push({
              id: row.price_id,
              unit_amount: row.unit_amount,
              currency: row.currency,
              recurring: row.recurring,
            });
          }
        }
        
        res.json({ plans: Array.from(productsMap.values()), source: 'stripe' });
      } else {
        // Fallback to static pricing if no Stripe products
        res.json({ plans: PRICING_PLANS, source: 'static' });
      }
    } catch (error: any) {
      console.error("Pricing fetch error:", error);
      // Fallback to static pricing on error
      res.json({ plans: PRICING_PLANS, source: 'static' });
    }
  });

  // Contact form submission
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(validatedData);
      res.status(201).json({ success: true, message: "Thank you for your message! We'll get back to you soon.", contact });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid form data", details: error.errors });
      }
      console.error("Contact form error:", error);
      res.status(500).json({ error: "Failed to submit contact form" });
    }
  });

  // Newsletter subscription
  app.post("/api/newsletter", async (req, res) => {
    try {
      const validatedData = insertNewsletterSchema.parse(req.body);
      
      // Check if already subscribed
      const existing = await storage.getNewsletterByEmail(validatedData.email);
      if (existing) {
        if (existing.subscribed) {
          return res.status(400).json({ error: "Email is already subscribed" });
        } else {
          // Re-subscribe
          await storage.createNewsletterSubscription(validatedData);
          return res.json({ success: true, message: "Welcome back! You've been re-subscribed." });
        }
      }
      
      const newsletter = await storage.createNewsletterSubscription(validatedData);
      res.status(201).json({ success: true, message: "Successfully subscribed to our newsletter!", newsletter });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      console.error("Newsletter subscription error:", error);
      res.status(500).json({ error: "Failed to subscribe to newsletter" });
    }
  });

  // Unsubscribe from newsletter
  app.post("/api/newsletter/unsubscribe", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      await storage.unsubscribeNewsletter(email);
      res.json({ success: true, message: "Successfully unsubscribed from newsletter" });
    } catch (error: any) {
      console.error("Unsubscribe error:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Mini-games endpoints
  app.post("/api/games/play", async (req, res) => {
    try {
      const { gameType, difficulty, userId } = req.body;
      if (!gameType || !difficulty) {
        return res.status(400).json({ error: "Game type and difficulty are required" });
      }
      res.json({ success: true, message: "Game started", gameId: Math.random().toString() });
    } catch (error: any) {
      console.error("Game start error:", error);
      res.status(500).json({ error: "Failed to start game" });
    }
  });

  app.post("/api/games/score", async (req, res) => {
    try {
      const { gameId, score, timeSpent } = req.body;
      if (!gameId || score === undefined) {
        return res.status(400).json({ error: "Game ID and score are required" });
      }
      const pointsEarned = Math.min(score / 10, 150);
      res.json({ success: true, pointsEarned, message: "Score recorded" });
    } catch (error: any) {
      console.error("Score recording error:", error);
      res.status(500).json({ error: "Failed to record score" });
    }
  });

  // Financial calculators endpoints
  app.get("/api/calculators", async (req, res) => {
    try {
      const calculators = [
        { id: "mortgage", name: "Mortgage Calculator", affiliate: true, link: "https://www.inchcalculator.com/mortgage-calculator/", provider: "Inch Calculator" },
        { id: "retirement", name: "Retirement Savings Calculator", affiliate: true, link: "https://www.inchcalculator.com/retirement-calculator/", provider: "Inch Calculator" },
        { id: "budget", name: "Budget Planner", affiliate: true, link: "https://www.freshbooks.com/", provider: "FreshBooks" },
        { id: "tax", name: "Tax Calculator", affiliate: true, link: "https://www.inchcalculator.com/tax-calculator/", provider: "Inch Calculator" },
        { id: "compound-interest", name: "Compound Interest Calculator", affiliate: true, link: "https://www.inchcalculator.com/compound-interest-calculator/", provider: "Inch Calculator" },
        { id: "investment-return", name: "Investment Return Calculator", affiliate: true, link: "https://www.inchcalculator.com/return-on-investment-calculator/", provider: "Inch Calculator" }
      ];
      res.json({ calculators });
    } catch (error: any) {
      console.error("Calculators error:", error);
      res.status(500).json({ error: "Failed to get calculators" });
    }
  });

  // Affiliate partners endpoints
  app.get("/api/affiliates", async (req, res) => {
    try {
      const partners = [
        { id: "quickbooks", name: "QuickBooks", category: "Accounting", link: "https://quickbooks.intuit.com/partners/", commission: "$50-200/lead" },
        { id: "freshbooks", name: "FreshBooks", category: "Invoicing & Accounting", link: "https://www.freshbooks.com/affiliate-program", commission: "$88-200/sale" },
        { id: "xero", name: "Xero", category: "Cloud Accounting", link: "https://www.xero.com/partners/", commission: "$10/subscriber" },
        { id: "gusto", name: "Gusto", category: "Payroll & HR", link: "https://gusto.com/partners", commission: "Recurring bonus" },
        { id: "personal-capital", name: "Personal Capital", category: "Wealth Management", link: "https://www.personalcapital.com/affiliate", commission: "$100/qualified lead" },
        { id: "ynab", name: "YNAB (You Need A Budget)", category: "Budgeting", link: "https://www.youneedabudget.com/affiliates/", commission: "Recurring commission" },
        { id: "robinhood", name: "Robinhood", category: "Stock Trading", link: "https://www.robinhood.com/affiliate", commission: "$5-20/funded account" },
        { id: "etoro", name: "eToro", category: "Trading Platform", link: "https://www.etoro.com/en-us/partners/", commission: "25% revenue share" }
      ];
      res.json({ partners });
    } catch (error: any) {
      console.error("Affiliates error:", error);
      res.status(500).json({ error: "Failed to get affiliates" });
    }
  });

  app.post("/api/affiliates/link", async (req, res) => {
    try {
      const { partnerId, affiliate } = req.body;
      if (!partnerId) {
        return res.status(400).json({ error: "Partner ID is required" });
      }
      res.json({ success: true, message: "Affiliate link tracked" });
    } catch (error: any) {
      console.error("Affiliate link error:", error);
      res.status(500).json({ error: "Failed to track affiliate link" });
    }
  });

  // AI Assistant Endpoints
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      const reply = await generateAIResponse(message, context);
      res.json({ reply });
    } catch (error: any) {
      console.error("AI chat error:", error);
      res.status(500).json({ error: "Failed to generate AI response" });
    }
  });

  app.post("/api/ai/goal-recommendations", async (req, res) => {
    try {
      const { userContext } = req.body;
      if (!userContext) {
        return res.status(400).json({ error: "User context is required" });
      }
      const recommendations = await generateGoalRecommendations(userContext);
      res.json({ recommendations });
    } catch (error: any) {
      console.error("Goal recommendations error:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  app.post("/api/ai/financial-insights", async (req, res) => {
    try {
      const { financialData } = req.body;
      if (!financialData) {
        return res.status(400).json({ error: "Financial data is required" });
      }
      const insights = await generateFinancialInsights(financialData);
      res.json({ insights });
    } catch (error: any) {
      console.error("Financial insights error:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  app.post("/api/ai/analyze-progress", async (req, res) => {
    try {
      const { goalDescription, progress } = req.body;
      if (!goalDescription || progress === undefined) {
        return res.status(400).json({ error: "Goal description and progress are required" });
      }
      const analysis = await generateAIResponse(
        `Analyze my goal progress: "${goalDescription}" - I'm at ${progress}% completion. Provide next steps and encouragement.`
      );
      res.json({ analysis });
    } catch (error: any) {
      console.error("Progress analysis error:", error);
      res.status(500).json({ error: "Failed to analyze progress" });
    }
  });

  return httpServer;
}
