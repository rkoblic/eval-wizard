import { NextRequest, NextResponse } from "next/server";
import { EDUCATION_CRITERIA } from "@/lib/types";
import { testAIProduct } from "@/lib/llm/openai-client";
import { judgeResponse } from "@/lib/llm/anthropic-client";
import { projects, testCases } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { projectId, testCaseId, criteriaIds } = await request.json();

    if (!projectId || !testCaseId || !criteriaIds) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get project and test case
    const project = projects.get(projectId);
    const projectTestCases = testCases.get(projectId) || [];
    const testCase = projectTestCases.find((tc) => tc.id === testCaseId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!testCase) {
      return NextResponse.json({ error: "Test case not found" }, { status: 404 });
    }

    // Get criteria
    const criteria = EDUCATION_CRITERIA.filter((c) =>
      criteriaIds.includes(c.id)
    );

    // Test the AI product with this test case
    console.log(`Testing AI with input: ${testCase.input}`);
    const aiResponse = await testAIProduct(project.systemPrompt, testCase.input);
    console.log(`Got AI response: ${aiResponse.substring(0, 100)}...`);

    // Judge the response against each criterion in parallel
    console.log(`Judging against ${criteria.length} criteria`);
    const judgments = await Promise.all(
      criteria.map(async (criterion) => {
        try {
          const judgment = await judgeResponse(
            testCase.input,
            aiResponse,
            criterion
          );

          return {
            criterionId: criterion.id,
            criterionName: criterion.name,
            pass: judgment.pass,
            reasoning: judgment.reasoning,
          };
        } catch (error) {
          console.error(`Error judging ${criterion.id}:`, error);
          return {
            criterionId: criterion.id,
            criterionName: criterion.name,
            pass: false,
            reasoning: "Error occurred during evaluation",
          };
        }
      })
    );

    return NextResponse.json({
      testCase: {
        id: testCase.id,
        input: testCase.input,
        expectedBehavior: testCase.expectedBehavior,
      },
      aiResponse,
      judgments,
    });
  } catch (error) {
    console.error("Error running preview evaluation:", error);
    return NextResponse.json(
      { error: "Failed to run preview evaluation" },
      { status: 500 }
    );
  }
}
