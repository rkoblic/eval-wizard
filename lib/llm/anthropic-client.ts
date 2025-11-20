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

/**
 * Use Claude as a judge to evaluate an entire conversation
 * Designed for multi-turn conversations where context and consistency matter
 * Now supports personalized quality standards via few-shot examples
 */
export async function judgeConversation(
  conversation: Array<{ role: "user" | "assistant"; content: string }>,
  criterion: { name: string; description: string },
  isCheckpoint: boolean = false,
  fewShotExamples?: Array<{
    conversation: Array<{ role: "user" | "assistant"; content: string }>;
    pass: boolean;
    reasoning: string;
  }>
): Promise<{ pass: boolean; reasoning: string }> {
  // Format the conversation for the judge
  const conversationText = conversation
    .map((msg) => {
      if (msg.role === "user") {
        return `Student: ${msg.content}`;
      } else {
        return `AI: ${msg.content}`;
      }
    })
    .join("\n\n");

  const checkpointNote = isCheckpoint
    ? "\n\nNote: This is a checkpoint evaluation. Evaluate the conversation so far, understanding that it may continue."
    : "\n\nNote: This is the complete conversation. Evaluate the entire exchange holistically.";

  // Format few-shot examples if provided
  let fewShotSection = "";
  if (fewShotExamples && fewShotExamples.length > 0) {
    fewShotSection = `\n\n## Training Examples\n\nHere are examples of conversations previously graded by the user, which demonstrate their quality standards:\n\n`;

    fewShotExamples.forEach((example, idx) => {
      const exampleText = example.conversation
        .map((msg) => {
          if (msg.role === "user") {
            return `Student: ${msg.content}`;
          } else {
            return `AI: ${msg.content}`;
          }
        })
        .join("\n\n");

      const verdict = example.pass ? "PASS" : "FAIL";
      fewShotSection += `### Example ${idx + 1}: ${verdict}\n\n${exampleText}\n\nUser's Assessment: "${example.reasoning}"\nVerdict: ${verdict}\n\n`;
    });

    fewShotSection += `These examples show what the user considers good (PASS) and poor (FAIL) quality. Use these standards when evaluating new conversations.\n\n`;
  }

  const judgePrompt = `You are evaluating an AI assistant's performance across a conversation using personalized quality standards.

## Conversation to Evaluate:

${conversationText}
${checkpointNote}
${fewShotSection}
## Evaluation Criterion:

**${criterion.name}**: ${criterion.description}

## Your Task:

Evaluate if the conversation PASSES or FAILS on the criterion "${criterion.name}". ${
  fewShotExamples && fewShotExamples.length > 0
    ? "Consider the training examples above to understand the user's quality standards and apply those same standards to this new conversation."
    : "Evaluate based on the criterion description provided."
}

For conversation-level criteria, evaluate across ALL turns:
- Does the AI remember and build on earlier exchanges?
- Is the flow natural and coherent?
- Are transitions between topics handled well?
- Does the AI maintain appropriate tone and approach?

First, provide your reasoning (2-3 sentences explaining why it passes or fails, citing specific turns if relevant).
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
