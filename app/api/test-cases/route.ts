import { NextRequest, NextResponse } from "next/server";
import { TestCase } from "@/lib/types";

// In-memory storage (shared with projects route)
// In production, this would be in a database
const testCasesStore = new Map<string, TestCase[]>();

export async function POST(request: NextRequest) {
  try {
    const { projectId, testCases } = await request.json();

    if (!projectId || !testCases) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    testCasesStore.set(projectId, testCases);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving test cases:", error);
    return NextResponse.json(
      { error: "Failed to save test cases" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID required" },
      { status: 400 }
    );
  }

  const testCases = testCasesStore.get(projectId) || [];

  return NextResponse.json({ testCases });
}
