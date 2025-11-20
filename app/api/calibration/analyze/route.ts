import { NextRequest, NextResponse } from "next/server";
import { callOpenAI } from "@/lib/llm/openai-client";
import { humanGradedConversations, calibrationResults, getProject } from "@/lib/storage";
import { CalibrationResult, CustomCriterion, HumanGradedConversation } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400 }
      );
    }

    // Get graded conversations
    const conversations = humanGradedConversations.get(projectId) || [];

    if (conversations.length === 0) {
      return NextResponse.json(
        { error: "No graded conversations found" },
        { status: 404 }
      );
    }

    // Check if all conversations are graded
    const allGraded = conversations.every(c => c.userGrade.reasoning.trim() !== "");

    if (!allGraded) {
      return NextResponse.json(
        { error: "Not all conversations have been graded" },
        { status: 400 }
      );
    }

    console.log(`Analyzing ${conversations.length} graded conversations for project ${projectId}`);

    // Get project info for context
    const project = getProject(projectId);

    // Derive custom criteria from user feedback
    const customCriteria = await deriveCriteriaFromFeedback(project, conversations);

    // Select diverse few-shot examples
    const fewShotExamples = selectFewShotExamples(conversations);

    // Create calibration result
    const calibrationResult: CalibrationResult = {
      id: `calibration_${projectId}_${Date.now()}`,
      projectId,
      customCriteria,
      fewShotExamples,
      createdAt: new Date(),
      approvedByUser: false, // Will be set to true after user reviews
    };

    // Save to storage
    calibrationResults.set(projectId, calibrationResult);

    return NextResponse.json({
      success: true,
      calibrationResult,
    });
  } catch (error) {
    console.error("Error analyzing calibration:", error);
    return NextResponse.json(
      { error: "Failed to analyze calibration data" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing projectId" },
      { status: 400 }
    );
  }

  try {
    const calibrationResult = calibrationResults.get(projectId);

    if (!calibrationResult) {
      return NextResponse.json(
        { error: "No calibration result found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      calibrationResult,
    });
  } catch (error) {
    console.error("Error fetching calibration result:", error);
    return NextResponse.json(
      { error: "Failed to fetch calibration result" },
      { status: 500 }
    );
  }
}

async function deriveCriteriaFromFeedback(
  project: any,
  conversations: HumanGradedConversation[]
): Promise<CustomCriterion[]> {
  // Prepare feedback summary for analysis
  const feedbackSummary = conversations.map((c, idx) => ({
    conversationIndex: idx + 1,
    persona: c.persona.name,
    grade: c.userGrade.pass ? "PASS" : "FAIL",
    reasoning: c.userGrade.reasoning,
    conversationSummary: summarizeConversation(c.conversation),
  }));

  const prompt = `You are analyzing user feedback on AI assistant conversations to derive personalized quality criteria.

Project: ${project?.name || "AI Assistant"}
Description: ${project?.description || "N/A"}

The user has graded ${conversations.length} conversations. Here is their feedback:

${JSON.stringify(feedbackSummary, null, 2)}

Your task:
1. Analyze patterns in what the user valued (passes) vs. criticized (fails)
2. Identify 4-6 key quality criteria that capture the user's standards
3. Each criterion should be:
   - Specific and actionable
   - Clearly derived from patterns in the feedback
   - Applicable across different conversations
   - Distinct from other criteria

For each criterion, provide:
- **name**: Short, clear name (e.g., "Pedagogical Soundness", "Tone Appropriateness")
- **description**: Detailed explanation of what this criterion measures (2-3 sentences)
- **derivedFrom**: Brief summary of the pattern in user feedback that led to this criterion

Format your response as a JSON array:
[
  {
    "name": "Criterion Name",
    "description": "Detailed description of what this measures and how to evaluate it...",
    "derivedFrom": "User consistently praised conversations where X but criticized conversations lacking Y..."
  },
  ...
]

Focus on criteria that will be most useful for evaluating future conversations.
Look for both what the user wants (positive patterns) and what they want to avoid (negative patterns).

Provide ONLY the JSON array, no other text.`;

  try {
    const response = await callOpenAI(
      [{ role: "user", content: prompt }],
      "gpt-4-turbo-preview",
      0.5 // Lower temperature for more consistent analysis
    );

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse criteria from AI response");
    }

    const parsedCriteria = JSON.parse(jsonMatch[0]);

    // Add IDs
    const criteria: CustomCriterion[] = parsedCriteria.map((c: any, index: number) => ({
      id: `criterion_${index}_${Date.now()}`,
      name: c.name,
      description: c.description,
      derivedFrom: c.derivedFrom,
    }));

    return criteria;
  } catch (error) {
    console.error("Error deriving criteria:", error);

    // Return fallback criteria based on pass/fail counts
    const passCount = conversations.filter(c => c.userGrade.pass).length;
    const failCount = conversations.length - passCount;

    return [
      {
        id: `criterion_fallback_1_${Date.now()}`,
        name: "Overall Quality",
        description: "Evaluates whether the AI's responses meet user expectations for quality, appropriateness, and effectiveness.",
        derivedFrom: `Based on ${passCount} passing and ${failCount} failing conversations from user feedback.`,
      },
    ];
  }
}

function selectFewShotExamples(
  conversations: HumanGradedConversation[]
): HumanGradedConversation[] {
  // Select a diverse set of examples (max 6-8)
  const passes = conversations.filter(c => c.userGrade.pass);
  const fails = conversations.filter(c => !c.userGrade.pass);

  const examples: HumanGradedConversation[] = [];

  // Take 3-4 passes (or all if fewer)
  const passCount = Math.min(4, passes.length);
  for (let i = 0; i < passCount; i++) {
    const idx = Math.floor((i * passes.length) / passCount);
    examples.push(passes[idx]);
  }

  // Take 3-4 fails (or all if fewer)
  const failCount = Math.min(4, fails.length);
  for (let i = 0; i < failCount; i++) {
    const idx = Math.floor((i * fails.length) / failCount);
    examples.push(fails[idx]);
  }

  return examples;
}

function summarizeConversation(conversation: any[]): string {
  // Create a brief summary of the conversation
  const userMessages = conversation.filter(m => m.role === "user");
  const aiMessages = conversation.filter(m => m.role === "assistant");

  return `${userMessages.length} user turns, ${aiMessages.length} AI responses. Topics: ${userMessages.slice(0, 2).map(m => m.content.substring(0, 50)).join("; ")}...`;
}
