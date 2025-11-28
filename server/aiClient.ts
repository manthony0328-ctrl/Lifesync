import OpenAI from "openai";

let client: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function generateGoalRecommendations(userContext: string): Promise<string> {
  const openai = getAIClient();
  
  const message = await openai.chat.completions.create({
    model: "gpt-4-mini",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `As a productivity and finance expert, provide 3 specific, achievable goals for this user based on their context: "${userContext}". Format as a JSON array with objects containing 'goal', 'category' (finance/health/productivity/learning), 'difficulty' (easy/medium/hard), and 'reward_points'.`
      }
    ]
  });

  const content = message.choices[0].message.content;
  if (content) {
    return content;
  }
  throw new Error("Unexpected response type from AI");
}

export async function generateFinancialInsights(financialData: string): Promise<string> {
  const openai = getAIClient();
  
  const message = await openai.chat.completions.create({
    model: "gpt-4-mini",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `As a financial advisor, analyze this financial data and provide 3 actionable insights: "${financialData}". Be specific and practical. Format as a JSON object with 'insights' array containing objects with 'title' and 'recommendation'.`
      }
    ]
  });

  const content = message.choices[0].message.content;
  if (content) {
    return content;
  }
  throw new Error("Unexpected response type from AI");
}

export async function generateAIResponse(userMessage: string, context: string = ""): Promise<string> {
  const openai = getAIClient();
  
  const systemPrompt = `You are LifeSync Pro, an AI assistant helping ambitious professionals manage their finances, track goals, and grow side hustles. 
${context ? `User context: ${context}` : ""}
Be concise, helpful, and encouraging. Keep responses under 150 words.`;

  const message = await openai.chat.completions.create({
    model: "gpt-4-mini",
    max_tokens: 256,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userMessage
      }
    ]
  });

  const content = message.choices[0].message.content;
  if (content) {
    return content;
  }
  throw new Error("Unexpected response type from AI");
}

export async function analyzeGoalProgress(goalDescription: string, progress: number): Promise<string> {
  const openai = getAIClient();
  
  const message = await openai.chat.completions.create({
    model: "gpt-4-mini",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Analyze progress on this goal: "${goalDescription}" which is ${progress}% complete. Provide encouragement, next steps, and estimated time to completion. Be motivational.`
      }
    ]
  });

  const content = message.choices[0].message.content;
  if (content) {
    return content;
  }
  throw new Error("Unexpected response type from AI");
}
