import { NextRequest, NextResponse } from "next/server";
import { EDUCATION_CRITERIA, normalizeTestCase } from "@/lib/types";
import { judgeConversation } from "@/lib/llm/anthropic-client";
import { executeConversation } from "@/lib/llm/conversation-executor";
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

    // Normalize test case to conversation format (handles legacy single-turn tests)
    const { turns, expectedBehavior } = normalizeTestCase(testCase);

    // Get criteria
    const criteria = EDUCATION_CRITERIA.filter((c) =>
      criteriaIds.includes(c.id)
    );

    console.log(`Executing conversation with ${turns.length} turns`);

    // Execute the full conversation
    const conversation = await executeConversation(project.systemPrompt, turns);

    console.log(`Conversation complete, evaluating against ${criteria.length} criteria`);

    // Find checkpoint turns and final turn
    const checkpointIndices = turns
      .map((turn, idx) => (turn.evaluateAfter ? idx : -1))
      .filter((idx) => idx >= 0);

    // Evaluate at checkpoints
    const checkpointEvaluations = [];
    for (const checkpointIdx of checkpointIndices) {
      // Get conversation up to this checkpoint (include the checkpoint turn's response)
      const conversationUpToCheckpoint = conversation.slice(0, (checkpointIdx + 1) * 2);

      // Is this the final turn?
      const isFinal = checkpointIdx === turns.length - 1;

      // Evaluate at this checkpoint for all criteria
      const checkpointJudgments = await Promise.all(
        criteria.map(async (criterion) => {
          try {
            const judgment = await judgeConversation(
              conversationUpToCheckpoint,
              criterion,
              !isFinal // isCheckpoint = true unless this is the final turn
            );

            return {
              checkpointTurn: checkpointIdx,
              criterionId: criterion.id,
              criterionName: criterion.name,
              pass: judgment.pass,
              reasoning: judgment.reasoning,
              isFinal,
            };
          } catch (error) {
            console.error(`Error judging ${criterion.id} at checkpoint ${checkpointIdx}:`, error);
            return {
              checkpointTurn: checkpointIdx,
              criterionId: criterion.id,
              criterionName: criterion.name,
              pass: false,
              reasoning: "Error occurred during evaluation",
              isFinal,
            };
          }
        })
      );

      checkpointEvaluations.push(...checkpointJudgments);
    }

    // Separate final evaluations from checkpoint evaluations
    const finalEvaluations = checkpointEvaluations.filter((e) => e.isFinal);
    const intermediateEvaluations = checkpointEvaluations.filter((e) => !e.isFinal);

    return NextResponse.json({
      testCase: {
        id: testCase.id,
        turns,
        expectedBehavior,
      },
      conversation,
      checkpointEvaluations: intermediateEvaluations,
      finalEvaluations,
    });
  } catch (error) {
    console.error("Error running preview evaluation:", error);
    return NextResponse.json(
      { error: "Failed to run preview evaluation" },
      { status: 500 }
    );
  }
}
