import { NextRequest, NextResponse } from "next/server";
import { Persona } from "@/lib/types";
import { personas, savePersonas, getPersonas } from "@/lib/storage";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const projectPersonas = getPersonas(projectId);

  return NextResponse.json({ personas: projectPersonas });
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, personas: projectPersonas } = await request.json();

    if (!projectId || !projectPersonas) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save personas
    savePersonas(projectId, projectPersonas);

    return NextResponse.json({ success: true, personas: projectPersonas });
  } catch (error) {
    console.error("Error saving personas:", error);
    return NextResponse.json(
      { error: "Failed to save personas" },
      { status: 500 }
    );
  }
}
