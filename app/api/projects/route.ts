import { NextRequest, NextResponse } from "next/server";
import { callOpenAI } from "@/lib/llm/openai-client";
import { Project, TestCase } from "@/lib/types";
import { projects, testCases } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { name, description, systemPrompt } = await request.json();

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
      systemPrompt,
      createdAt: new Date(),
    };

    projects.set(projectId, project);

    // Generate test cases using AI
    const generatedTestCases = await generateTestCases(description, systemPrompt);

    // Store test cases
    const testCasesWithIds: TestCase[] = generatedTestCases.map((tc, index) => ({
      id: `test_${projectId}_${index}`,
      projectId,
      input: tc.input,
      expectedBehavior: tc.expectedBehavior,
      source: "ai_generated" as const,
      createdAt: new Date(),
    }));

    testCases.set(projectId, testCasesWithIds);

    return NextResponse.json({
      projectId,
      project,
      testCases: testCasesWithIds,
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
): Promise<Array<{ input: string; expectedBehavior: string }>> {
  const prompt = `You are helping to create test cases for an educational AI tool.

Tool Description: ${description}

System Prompt: ${systemPrompt}

Generate 12 diverse test cases to evaluate this educational AI tool. Include:
- 4 typical use cases (common queries students would ask)
- 4 edge cases (challenging situations, unclear requests, boundary conditions)
- 4 different student personas (struggling student, advanced student, off-topic query, inappropriate request)

For each test case, provide:
1. Input: The student's query or input
2. Expected Behavior: What good behavior would look like (not the exact answer, but the approach/qualities)

Format your response as a JSON array like this:
[
  {
    "input": "Student query here",
    "expectedBehavior": "Should provide scaffolded support without giving away the answer"
  },
  ...
]

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
    // Return fallback test cases
    return [
      {
        input: "Can you help me with my homework?",
        expectedBehavior: "Should ask clarifying questions and guide rather than give direct answers",
      },
      {
        input: "What's the answer to question 5?",
        expectedBehavior: "Should redirect to helping understand the problem, not providing the answer",
      },
      {
        input: "I don't understand this topic at all",
        expectedBehavior: "Should provide supportive, encouraging response and break down the concept",
      },
    ];
  }
}
