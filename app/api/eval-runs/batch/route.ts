import { NextRequest, NextResponse } from "next/server";
import { EvalResult, EDUCATION_CRITERIA } from "@/lib/types";
import { testAIProduct } from "@/lib/llm/openai-client";
import { judgeResponse } from "@/lib/llm/anthropic-client";
import { projects, testCases } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { projectId, testCaseIds, criteriaIds } = await request.json();

    if (!projectId || !testCaseIds || !criteriaIds) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get project and test cases
    const project = projects.get(projectId);
    const projectTestCases = testCases.get(projectId) || [];
    const batchTestCases = projectTestCases.filter((tc) =>
      testCaseIds.includes(tc.id)
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (batchTestCases.length === 0) {
      return NextResponse.json({ error: "No test cases found" }, { status: 404 });
    }

    // Get criteria
    const criteria = EDUCATION_CRITERIA.filter((c) =>
      criteriaIds.includes(c.id)
    );

    const results: EvalResult[] = [];

    // Process each test case in this batch
    for (const testCase of batchTestCases) {
      try {
        console.log(`Processing test case: ${testCase.id}`);

        // Test the AI product
        const aiResponse = await testAIProduct(project.systemPrompt, testCase.input);

        // Judge the response against each criterion in parallel
        const judgments = await Promise.all(
          criteria.map(async (criterion) => {
            try {
              const judgment = await judgeResponse(
                testCase.input,
                aiResponse,
                criterion
              );

              return {
                id: `result_${Date.now()}_${Math.random()}`,
                evalRunId: `batch_${Date.now()}`, // Not used for batch mode
                testCaseId: testCase.id,
                criterionId: criterion.id,
                pass: judgment.pass,
                reasoning: judgment.reasoning,
                aiResponse,
                createdAt: new Date(),
              };
            } catch (error) {
              console.error(`Error judging ${criterion.id}:`, error);
              return {
                id: `result_${Date.now()}_${Math.random()}`,
                evalRunId: `batch_${Date.now()}`,
                testCaseId: testCase.id,
                criterionId: criterion.id,
                pass: false,
                reasoning: "Error occurred during evaluation",
                aiResponse,
                createdAt: new Date(),
              };
            }
          })
        );

        results.push(...judgments);
      } catch (error) {
        console.error(`Error processing test case ${testCase.id}:`, error);
        // Add failed results for this test case
        criteria.forEach((criterion) => {
          results.push({
            id: `result_${Date.now()}_${Math.random()}`,
            evalRunId: `batch_${Date.now()}`,
            testCaseId: testCase.id,
            criterionId: criterion.id,
            pass: false,
            reasoning: `Error testing AI: ${error}`,
            aiResponse: "",
            createdAt: new Date(),
          });
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      processedCount: batchTestCases.length,
    });
  } catch (error) {
    console.error("Error running batch evaluation:", error);
    return NextResponse.json(
      { error: "Failed to run batch evaluation" },
      { status: 500 }
    );
  }
}
