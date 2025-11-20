import { NextRequest, NextResponse } from "next/server";
import { callOpenAI } from "@/lib/llm/openai-client";
import { executeConversation } from "@/lib/llm/conversation-executor";
import { HumanGradedConversation, ConversationTurn } from "@/lib/types";
import { getProject, getPersonas, saveCalibrationProgress, humanGradedConversations } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400 }
      );
    }

    // Load project and personas
    const project = getProject(projectId);
    const personas = getPersonas(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!personas || personas.length === 0) {
      return NextResponse.json(
        { error: "No personas found. Create personas first." },
        { status: 400 }
      );
    }

    console.log(`Generating 10 training conversations for project ${projectId}`);

    // Generate 10 conversation scenarios (user queries only)
    const scenarios = await generateConversationScenarios(project, personas);

    // Execute each scenario to get real AI responses
    const conversations: HumanGradedConversation[] = [];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      console.log(`Executing conversation ${i + 1}/10`);

      try {
        // Execute the conversation to get actual AI responses
        const conversation = await executeConversation(
          project.systemPrompt,
          scenario.turns
        );

        const gradedConversation: HumanGradedConversation = {
          id: `grading_${projectId}_${i}_${Date.now()}`,
          projectId,
          persona: scenario.persona,
          conversation,
          userGrade: {
            pass: false, // Will be filled in by user
            reasoning: "", // Will be filled in by user
          },
          createdAt: new Date(),
        };

        conversations.push(gradedConversation);
      } catch (error) {
        console.error(`Error executing conversation ${i + 1}:`, error);
        // Skip failed conversations
      }
    }

    // Save conversations to storage
    humanGradedConversations.set(projectId, conversations);

    // Initialize calibration progress
    saveCalibrationProgress(projectId, {
      projectId,
      totalRequired: conversations.length,
      completed: 0,
      grades: [],
    });

    // Save to session storage as backup
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        `calibration_conversations_${projectId}`,
        JSON.stringify(conversations)
      );
    }

    return NextResponse.json({
      success: true,
      conversations,
      count: conversations.length,
    });
  } catch (error) {
    console.error("Error generating training conversations:", error);
    return NextResponse.json(
      { error: "Failed to generate training conversations" },
      { status: 500 }
    );
  }
}

async function generateConversationScenarios(
  project: any,
  personas: any[]
): Promise<Array<{ persona: any; turns: ConversationTurn[] }>> {
  const prompt = `You are helping create training conversations for evaluating an AI assistant.

Project: ${project.name}
Description: ${project.description}

Available Personas:
${personas
  .map(
    (p, i) => `${i + 1}. ${p.name}
   Demographics: ${JSON.stringify(p.demographics)}
   Goals: ${p.goals.join(", ")}
   Challenges: ${p.challenges.join(", ")}
   Context: ${p.context}`
  )
  .join("\n\n")}

Generate 10 diverse conversation scenarios. Each scenario should:
1. Use one of the personas above (distribute evenly across personas)
2. Have 3-5 realistic user messages that build on each other
3. Represent different types of interactions (easy, challenging, edge cases, etc.)
4. Be realistic to how that persona would communicate

For each scenario, provide:
- personaIndex: Which persona (0-${personas.length - 1})
- turns: Array of 3-5 user messages

Format as JSON array:
[
  {
    "personaIndex": 0,
    "turns": [
      { "role": "user", "content": "First message from user", "evaluateAfter": false },
      { "role": "user", "content": "Follow-up message", "evaluateAfter": false },
      { "role": "user", "content": "Final message", "evaluateAfter": true }
    ]
  },
  ...
]

Make the conversations realistic - include follow-up questions, clarifications, and natural flow.

Provide ONLY the JSON array, no other text.`;

  try {
    const response = await callOpenAI(
      [{ role: "user", content: prompt }],
      "gpt-4-turbo-preview",
      0.8
    );

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse scenarios from AI response");
    }

    const parsedScenarios = JSON.parse(jsonMatch[0]);

    // Map persona indices to actual personas
    const scenarios = parsedScenarios.map((scenario: any) => ({
      persona: personas[scenario.personaIndex] || personas[0],
      turns: scenario.turns,
    }));

    // Limit to 10 scenarios
    return scenarios.slice(0, 10);
  } catch (error) {
    console.error("Error generating scenarios:", error);

    // Return fallback scenarios
    return personas.slice(0, 3).map((persona, idx) => ({
      persona,
      turns: [
        {
          role: "user" as const,
          content: `Hi, I need help with ${persona.goals[0] || "my goal"}`,
          evaluateAfter: false,
        },
        {
          role: "user" as const,
          content: `I'm having trouble with ${persona.challenges[0] || "understanding this"}`,
          evaluateAfter: false,
        },
        {
          role: "user" as const,
          content: "Can you explain that in a different way?",
          evaluateAfter: true,
        },
      ],
    }));
  }
}
