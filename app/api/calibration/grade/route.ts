import { NextRequest, NextResponse } from "next/server";
import { humanGradedConversations, getCalibrationProgress, saveCalibrationProgress } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { projectId, conversationId, pass, reasoning, completedIndex } = await request.json();

    if (!projectId || !conversationId || reasoning === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get conversations for this project
    const conversations = humanGradedConversations.get(projectId) || [];

    if (conversations.length === 0) {
      return NextResponse.json(
        { error: "No conversations found for this project" },
        { status: 404 }
      );
    }

    // Find and update the specific conversation
    const conversationIndex = conversations.findIndex(c => c.id === conversationId);

    if (conversationIndex === -1) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Update the conversation's grade
    conversations[conversationIndex].userGrade = {
      pass,
      reasoning,
    };

    // Save updated conversations back to storage
    humanGradedConversations.set(projectId, conversations);

    // Update calibration progress
    const progress = getCalibrationProgress(projectId) || {
      projectId,
      totalRequired: conversations.length,
      completed: 0,
      grades: [] as Array<{
        conversationId: string;
        pass: boolean;
        reasoning: string;
      }>,
    };

    // Check if this grade already exists in progress
    const existingGradeIndex = progress.grades.findIndex(
      g => g.conversationId === conversationId
    );

    if (existingGradeIndex !== -1) {
      // Update existing grade
      progress.grades[existingGradeIndex] = {
        conversationId,
        pass,
        reasoning,
      };
    } else {
      // Add new grade
      progress.grades.push({
        conversationId,
        pass,
        reasoning,
      });
    }

    // Update completed count (count grades with non-empty reasoning)
    progress.completed = progress.grades.filter(g => g.reasoning.trim() !== "").length;

    // Save progress
    saveCalibrationProgress(projectId, progress);

    return NextResponse.json({
      success: true,
      progress: {
        completed: progress.completed,
        total: progress.totalRequired,
      },
    });
  } catch (error) {
    console.error("Error saving grade:", error);
    return NextResponse.json(
      { error: "Failed to save grade" },
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
    const conversations = humanGradedConversations.get(projectId) || [];
    const progress = getCalibrationProgress(projectId);

    return NextResponse.json({
      conversations,
      progress,
    });
  } catch (error) {
    console.error("Error fetching grades:", error);
    return NextResponse.json(
      { error: "Failed to fetch grades" },
      { status: 500 }
    );
  }
}
