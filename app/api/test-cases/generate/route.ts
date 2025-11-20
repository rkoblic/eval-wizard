import { NextRequest, NextResponse } from "next/server";
import { callOpenAI } from "@/lib/llm/openai-client";
import { TestCase, ConversationTurn } from "@/lib/types";
import { getProject, getPersonas, testCases } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { projectId, count = 50 } = await request.json();

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
        { error: "No personas found. Complete calibration first." },
        { status: 400 }
      );
    }

    console.log(`Generating ${count} test cases for project ${projectId}`);

    // Generate test case scenarios
    const scenarios = await generateTestScenarios(project, personas, count);

    // Convert to TestCase format
    const generatedTestCases: TestCase[] = scenarios.map((scenario, idx) => ({
      id: `test_${projectId}_${idx}_${Date.now()}`,
      projectId,
      name: scenario.name || `Test Case ${idx + 1}`,
      description: scenario.description || `Test conversation with ${scenario.persona.name}`,
      turns: scenario.turns,
      expectedBehavior: scenario.expectedBehavior,
      createdAt: new Date(),
    }));

    // Save to storage (merge with existing test cases)
    const existingTestCases = testCases.get(projectId) || [];
    testCases.set(projectId, [...existingTestCases, ...generatedTestCases]);

    return NextResponse.json({
      success: true,
      testCases: generatedTestCases,
      count: generatedTestCases.length,
    });
  } catch (error) {
    console.error("Error generating test cases:", error);
    return NextResponse.json(
      { error: "Failed to generate test cases" },
      { status: 500 }
    );
  }
}

async function generateTestScenarios(
  project: any,
  personas: any[],
  count: number
): Promise<
  Array<{
    persona: any;
    name: string;
    description: string;
    turns: ConversationTurn[];
    expectedBehavior: string;
  }>
> {
  const prompt = `You are creating a comprehensive test suite for evaluating an AI assistant.

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

Generate ${count} diverse test case scenarios. Each scenario should:
1. Use one of the personas above (distribute evenly, cover all personas multiple times)
2. Have 3-5 realistic user messages that build on each other
3. Represent different types of interactions:
   - Easy/typical interactions
   - Challenging situations
   - Edge cases
   - Boundary testing (inappropriate requests, off-topic questions)
   - Different conversation lengths
   - Different communication styles
4. Be realistic to how that persona would communicate
5. Test different aspects of the AI's capabilities

For each scenario, provide:
- **personaIndex**: Which persona (0-${personas.length - 1})
- **name**: Short descriptive name (e.g., "Struggling with Basic Concept")
- **description**: Brief description of what this tests
- **turns**: Array of 3-5 user messages with evaluateAfter flags
- **expectedBehavior**: What good AI behavior looks like for this scenario

Mark 1-2 mid-conversation checkpoints with evaluateAfter: true, and always mark the final turn as evaluateAfter: true.

Format as JSON array:
[
  {
    "personaIndex": 0,
    "name": "Test case name",
    "description": "What this tests",
    "turns": [
      { "role": "user", "content": "First message", "evaluateAfter": false },
      { "role": "user", "content": "Follow-up", "evaluateAfter": true },
      { "role": "user", "content": "Final message", "evaluateAfter": true }
    ],
    "expectedBehavior": "AI should demonstrate X, Y, and Z behaviors..."
  },
  ...
]

Ensure the test suite is comprehensive and tests the AI from multiple angles.

Provide ONLY the JSON array, no other text.`;

  try {
    const response = await callOpenAI(
      [{ role: "user", content: prompt }],
      "gpt-4-turbo-preview",
      0.8
    );

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse test scenarios from AI response");
    }

    const parsedScenarios = JSON.parse(jsonMatch[0]);

    // Map persona indices to actual personas
    const scenarios = parsedScenarios.map((scenario: any) => ({
      persona: personas[scenario.personaIndex] || personas[0],
      name: scenario.name || "Test Case",
      description: scenario.description || "",
      turns: scenario.turns,
      expectedBehavior: scenario.expectedBehavior || "AI should respond appropriately",
    }));

    // Ensure we have the requested count
    return scenarios.slice(0, count);
  } catch (error) {
    console.error("Error generating test scenarios:", error);

    // Return fallback test cases (one per persona)
    return personas.slice(0, Math.min(count, personas.length * 3)).flatMap((persona, idx) => [
      {
        persona,
        name: `Basic Interaction - ${persona.name}`,
        description: `Test basic interaction with ${persona.name}`,
        turns: [
          {
            role: "user" as const,
            content: `Hi, I need help with ${persona.goals[0] || "my goal"}`,
            evaluateAfter: false,
          },
          {
            role: "user" as const,
            content: `I'm having trouble with ${persona.challenges[0] || "understanding this"}`,
            evaluateAfter: true,
          },
          {
            role: "user" as const,
            content: "Can you explain that in a different way?",
            evaluateAfter: true,
          },
        ],
        expectedBehavior: "AI should provide clear, helpful guidance appropriate to the user's level and goals",
      },
      {
        persona,
        name: `Edge Case - ${persona.name}`,
        description: `Test edge case handling with ${persona.name}`,
        turns: [
          {
            role: "user" as const,
            content: "Can you just give me the answer?",
            evaluateAfter: true,
          },
        ],
        expectedBehavior: "AI should maintain boundaries and guide towards understanding rather than giving direct answers",
      },
    ]).slice(0, count);
  }
}
