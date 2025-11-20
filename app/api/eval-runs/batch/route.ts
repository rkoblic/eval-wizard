import { NextRequest, NextResponse } from "next/server";
import { EvalResult, EDUCATION_CRITERIA, normalizeTestCase, ConversationResult } from "@/lib/types";
import { judgeConversation } from "@/lib/llm/anthropic-client";
import { executeConversation } from "@/lib/llm/conversation-executor";
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

    const results: ConversationResult[] = [];

    // Process each test case in this batch
    for (const testCase of batchTestCases) {
      try {
        console.log(`Processing test case: ${testCase.id}`);

        // Normalize test case to conversation format
        const { turns, expectedBehavior } = normalizeTestCase(testCase);

        // Execute the conversation
        const conversation = await executeConversation(project.systemPrompt, turns);

        // Find checkpoint turns
        const checkpointIndices = turns
          .map((turn, idx) => (turn.evaluateAfter ? idx : -1))
          .filter((idx) => idx >= 0);

        // Evaluate at each checkpoint
        const checkpointEvaluations: Array<{
          afterTurnIndex: number;
          criterionId: string;
          pass: boolean;
          reasoning: string;
        }> = [];
        let finalEvaluations: Array<{
          criterionId: string;
          pass: boolean;
          reasoning: string;
        }> = [];

        for (const checkpointIdx of checkpointIndices) {
          // Get conversation up to this checkpoint
          const conversationUpToCheckpoint = conversation.slice(0, (checkpointIdx + 1) * 2);

          // Is this the final turn?
          const isFinal = checkpointIdx === turns.length - 1;

          // Evaluate at this checkpoint
          const checkpointJudgments = await Promise.all(
            criteria.map(async (criterion) => {
              try {
                const judgment = await judgeConversation(
                  conversationUpToCheckpoint,
                  criterion,
                  !isFinal
                );

                return {
                  afterTurnIndex: checkpointIdx,
                  criterionId: criterion.id,
                  pass: judgment.pass,
                  reasoning: judgment.reasoning,
                  isFinal,
                };
              } catch (error) {
                console.error(`Error judging ${criterion.id}:`, error);
                return {
                  afterTurnIndex: checkpointIdx,
                  criterionId: criterion.id,
                  pass: false,
                  reasoning: "Error occurred during evaluation",
                  isFinal,
                };
              }
            })
          );

          // Separate final from checkpoint evaluations
          if (isFinal) {
            finalEvaluations = checkpointJudgments.map((j) => ({
              criterionId: j.criterionId,
              pass: j.pass,
              reasoning: j.reasoning,
            }));
          } else {
            checkpointEvaluations.push(...checkpointJudgments.map((j) => ({
              afterTurnIndex: j.afterTurnIndex,
              criterionId: j.criterionId,
              pass: j.pass,
              reasoning: j.reasoning,
            })));
          }
        }

        // Create conversation result
        results.push({
          id: `conv_result_${Date.now()}_${Math.random()}`,
          evalRunId: `batch_${Date.now()}`,
          testCaseId: testCase.id,
          conversation,
          checkpointEvaluations,
          finalEvaluation: finalEvaluations,
          createdAt: new Date(),
        });
      } catch (error) {
        console.error(`Error processing test case ${testCase.id}:`, error);
        // Create a failed result for this test case
        results.push({
          id: `conv_result_${Date.now()}_${Math.random()}`,
          evalRunId: `batch_${Date.now()}`,
          testCaseId: testCase.id,
          conversation: [],
          checkpointEvaluations: [],
          finalEvaluation: criteria.map((c) => ({
            criterionId: c.id,
            pass: false,
            reasoning: `Error testing AI: ${error}`,
          })),
          createdAt: new Date(),
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
