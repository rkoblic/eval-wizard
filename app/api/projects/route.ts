import { NextRequest, NextResponse } from "next/server";
import { callOpenAI } from "@/lib/llm/openai-client";
import { Project, TestCase, ConversationTurn } from "@/lib/types";
import { projects, testCases } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { name, description, systemPrompt, projectType } = await request.json();

    // Validate input
    if (!name || !description || !systemPrompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create project
    const projectId = `proj_${Date.now()}`;
    const project: Project = {
      id: projectId,
      name,
      description,
      productType: "system_prompt",
      projectType: projectType || "other",
      systemPrompt,
      createdAt: new Date(),
    };

    projects.set(projectId, project);

    // No longer auto-generate test cases - users will define personas first
    // Test cases will be generated after calibration using personas

    return NextResponse.json({
      projectId,
      project,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("id");

  if (projectId) {
    const project = projects.get(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectTestCases = testCases.get(projectId) || [];

    return NextResponse.json({
      project,
      testCases: projectTestCases,
    });
  }

  // Return all projects
  return NextResponse.json({
    projects: Array.from(projects.values()),
  });
}

async function generateTestCases(
  description: string,
  systemPrompt: string
): Promise<Array<{ turns: ConversationTurn[]; expectedBehavior: string }>> {
  const prompt = `You are helping to create multi-turn conversation test cases for an educational AI tool.

Tool Description: ${description}

System Prompt: ${systemPrompt}

Generate 12 diverse conversation-based test cases to evaluate this educational AI tool. Each test case should be a realistic multi-turn conversation (3-5 turns) between a student and the AI.

Include:
- 4 typical use cases (common learning conversations)
- 4 edge cases (challenging situations, misunderstandings, boundary conditions)
- 4 different student personas (struggling student, advanced student, off-topic query, inappropriate request)

For each test case, provide:
1. **turns**: An array of 3-5 student messages that represent a realistic conversation flow
   - Mark 1-2 middle turns with "evaluateAfter: true" to create checkpoints for evaluation
   - The final turn should always have "evaluateAfter: true"
2. **expectedBehavior**: What good behavior would look like across the entire conversation

Format your response as a JSON array like this:
[
  {
    "turns": [
      { "role": "user", "content": "Can you help me understand fractions?", "evaluateAfter": false },
      { "role": "user", "content": "I still don't get why 1/2 is bigger than 1/4", "evaluateAfter": true },
      { "role": "user", "content": "Oh I see! Can you give me a practice problem?", "evaluateAfter": true }
    ],
    "expectedBehavior": "Should build understanding progressively, check comprehension at checkpoints, remember context from earlier turns, and provide appropriate practice"
  },
  ...
]

Remember:
- Student messages should flow naturally, building on each other
- Mark strategic points for checkpoint evaluation (middle turns where key concepts should be explained)
- Always mark the final turn for evaluation
- Keep conversations realistic and educational

Provide ONLY the JSON array, no other text.`;

  try {
    const response = await callOpenAI(
      [{ role: "user", content: prompt }],
      "gpt-4-turbo-preview",
      0.7
    );

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse test cases from AI response");
    }

    const testCases = JSON.parse(jsonMatch[0]);
    return testCases;
  } catch (error) {
    console.error("Error generating test cases:", error);
    // Return fallback conversation test cases
    return [
      {
        turns: [
          { role: "user", content: "Can you help me with my homework?", evaluateAfter: false },
          { role: "user", content: "I need help with question 5 about fractions", evaluateAfter: true },
          { role: "user", content: "Can you just give me the answer?", evaluateAfter: true },
        ],
        expectedBehavior: "Should ask clarifying questions, guide understanding rather than give direct answers, and maintain pedagogical boundaries",
      },
      {
        turns: [
          { role: "user", content: "I don't understand this topic at all", evaluateAfter: false },
          { role: "user", content: "Can you explain it in a simpler way?", evaluateAfter: true },
          { role: "user", content: "That makes more sense! What should I practice?", evaluateAfter: true },
        ],
        expectedBehavior: "Should provide supportive, encouraging responses, break down concepts progressively, and remember student's initial confusion",
      },
      {
        turns: [
          { role: "user", content: "What's 2+2?", evaluateAfter: false },
          { role: "user", content: "Why is it 4?", evaluateAfter: true },
          { role: "user", content: "Can you teach me about addition?", evaluateAfter: true },
        ],
        expectedBehavior: "Should guide towards understanding, explain reasoning, and adapt to student's evolving questions",
      },
    ];
  }
}
