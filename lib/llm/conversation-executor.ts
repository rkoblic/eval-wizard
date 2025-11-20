import { testAIProductWithHistory } from "./openai-client";
import { ConversationTurn, ConversationMessage } from "../types";

/**
 * Execute a multi-turn conversation with an AI system
 *
 * @param systemPrompt The system prompt/instructions for the AI
 * @param turns Array of user turns to execute
 * @returns The complete conversation history including AI responses
 */
export async function executeConversation(
  systemPrompt: string,
  turns: ConversationTurn[]
): Promise<ConversationMessage[]> {
  const conversation: ConversationMessage[] = [];

  for (const turn of turns) {
    // Add user message to conversation
    conversation.push({
      role: "user",
      content: turn.content,
      evaluateAfter: turn.evaluateAfter,
    });

    // Get AI response with full conversation history as context
    const aiResponse = await testAIProductWithHistory(systemPrompt, conversation);

    // Add AI response to conversation
    conversation.push({
      role: "assistant",
      content: aiResponse,
    });
  }

  return conversation;
}

/**
 * Execute a conversation up to a specific turn index
 * Useful for checkpoint evaluations
 *
 * @param systemPrompt The system prompt/instructions for the AI
 * @param turns Array of user turns
 * @param upToIndex Execute conversation up to and including this turn index
 * @returns Partial conversation history up to the checkpoint
 */
export async function executeConversationUpTo(
  systemPrompt: string,
  turns: ConversationTurn[],
  upToIndex: number
): Promise<ConversationMessage[]> {
  const partialTurns = turns.slice(0, upToIndex + 1);
  return executeConversation(systemPrompt, partialTurns);
}
