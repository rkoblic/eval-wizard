import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Call Anthropic Claude API
 */
export async function callClaude(
  messages: ClaudeMessage[],
  systemPrompt?: string,
  model: string = "claude-sonnet-4-0",
  temperature: number = 0
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      temperature,
      system: systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type === "text") {
      return content.text;
    }
    return "";
  } catch (error) {
    console.error("Anthropic API error:", error);
    throw new Error("Failed to call Anthropic API");
  }
}

/**
 * Use Claude as a judge to evaluate an AI response
 */
export async function judgeResponse(
  userQuery: string,
  aiResponse: string,
  criterion: { name: string; description: string }
): Promise<{ pass: boolean; reasoning: string }> {
  const judgePrompt = `You are evaluating an AI educational assistant's response.

Student Query: ${userQuery}

AI Response: ${aiResponse}

Evaluate if the response PASSES or FAILS on this criterion:
- ${criterion.name}: ${criterion.description}

First, provide your reasoning (2-3 sentences explaining why it passes or fails).
Then, give your final verdict as either "PASS" or "FAIL".

Format your response as:
Reasoning: [Your reasoning here]
Verdict: [PASS or FAIL]`;

  const messages: ClaudeMessage[] = [
    { role: "user", content: judgePrompt },
  ];

  const judgeResponse = await callClaude(messages);

  // Parse the response
  const reasoningMatch = judgeResponse.match(/Reasoning:\s*(.+?)(?=\nVerdict:)/s);
  const verdictMatch = judgeResponse.match(/Verdict:\s*(PASS|FAIL)/i);

  const reasoning = reasoningMatch?.[1]?.trim() || "No reasoning provided";
  const pass = verdictMatch?.[1]?.toUpperCase() === "PASS";

  return { pass, reasoning };
}

export default anthropic;
