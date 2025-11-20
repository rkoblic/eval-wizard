import { NextRequest, NextResponse } from "next/server";
import { TestCase } from "@/lib/types";
import { testCases } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { projectId, testCases: testCasesData } = await request.json();

    if (!projectId || !testCasesData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    testCases.set(projectId, testCasesData);

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

  const projectTestCases = testCases.get(projectId) || [];

  return NextResponse.json({ testCases: projectTestCases });
}
