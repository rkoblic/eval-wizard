import { NextRequest, NextResponse } from "next/server";
import { EvalRun, EvalResult, EDUCATION_CRITERIA } from "@/lib/types";
import { testAIProduct } from "@/lib/llm/openai-client";
import { judgeResponse } from "@/lib/llm/anthropic-client";
import { projects, testCases, evalRuns, evalResults } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { projectId, criteriaIds } = await request.json();

    if (!projectId || !criteriaIds) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get project and test cases from shared storage
    const project = projects.get(projectId);
    const projectTestCases = testCases.get(projectId) || [];

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (projectTestCases.length === 0) {
      return NextResponse.json({ error: "No test cases found" }, { status: 404 });
    }

    // Create eval run
    const evalRunId = `eval_${Date.now()}`;
    const evalRun: EvalRun = {
      id: evalRunId,
      projectId,
      status: "running",
      criteriaIds,
      createdAt: new Date(),
    };

    evalRuns.set(evalRunId, evalRun);

    // Run evaluations asynchronously
    runEvaluations(
      evalRunId,
      project.systemPrompt,
      projectTestCases,
      criteriaIds
    ).catch(console.error);

    return NextResponse.json({ evalRunId });
  } catch (error) {
    console.error("Error creating eval run:", error);
    return NextResponse.json(
      { error: "Failed to create eval run" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const evalRunId = request.nextUrl.searchParams.get("id");

  if (!evalRunId) {
    return NextResponse.json(
      { error: "Eval run ID required" },
      { status: 400 }
    );
  }

  const evalRun = evalRuns.get(evalRunId);
  if (!evalRun) {
    return NextResponse.json({ error: "Eval run not found" }, { status: 404 });
  }

  const results = evalResults.get(evalRunId) || [];

  return NextResponse.json({
    evalRun,
    results,
  });
}

async function runEvaluations(
  evalRunId: string,
  systemPrompt: string,
  testCases: any[],
  criteriaIds: string[]
) {
  const evalRun = evalRuns.get(evalRunId);
  if (!evalRun) return;

  const results: EvalResult[] = [];

  try {
    // Get criteria
    const criteria = EDUCATION_CRITERIA.filter((c) =>
      criteriaIds.includes(c.id)
    );

    // Run evaluations for each test case
    for (const testCase of testCases) {
      // Test the AI product
      const aiResponse = await testAIProduct(systemPrompt, testCase.input);

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
              evalRunId,
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
              evalRunId,
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
    }

    // Store results
    evalResults.set(evalRunId, results);

    // Update eval run status
    evalRun.status = "completed";
    evalRun.completedAt = new Date();
    evalRuns.set(evalRunId, evalRun);
  } catch (error) {
    console.error("Error running evaluations:", error);
    evalRun.status = "failed";
    evalRuns.set(evalRunId, evalRun);
  }
}
