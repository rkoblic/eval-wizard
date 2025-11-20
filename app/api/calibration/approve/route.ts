import { NextRequest, NextResponse } from "next/server";
import { calibrationResults } from "@/lib/storage";
import { CalibrationResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { projectId, calibrationResult } = await request.json();

    if (!projectId || !calibrationResult) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save the approved calibration result
    const updatedResult: CalibrationResult = {
      ...calibrationResult,
      approvedByUser: true,
    };

    calibrationResults.set(projectId, updatedResult);

    // Also save to session storage
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        `calibration_result_${projectId}`,
        JSON.stringify(updatedResult)
      );
    }

    return NextResponse.json({
      success: true,
      calibrationResult: updatedResult,
    });
  } catch (error) {
    console.error("Error approving calibration:", error);
    return NextResponse.json(
      { error: "Failed to approve calibration" },
      { status: 500 }
    );
  }
}
