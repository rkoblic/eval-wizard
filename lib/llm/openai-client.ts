import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call OpenAI chat completion API
 */
export async function callOpenAI(
  messages: ChatMessage[],
  model: string = "gpt-4-turbo-preview",
  temperature: number = 0
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to call OpenAI API");
  }
}

/**
 * Test a Custom GPT or AI agent with a given system prompt and user query
 */
export async function testAIProduct(
  systemPrompt: string,
  userQuery: string
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userQuery },
  ];

  return callOpenAI(messages, "gpt-4-turbo-preview", 0.7);
}

export default openai;
