import { NextRequest, NextResponse } from "next/server";
import { callOpenAI } from "@/lib/llm/openai-client";
import { Persona } from "@/lib/types";
import { savePersonas } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { projectId, audienceInfo } = await request.json();

    if (!projectId || !audienceInfo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate personas using GPT
    const personas = await generatePersonas(projectId, audienceInfo);

    // Save to storage
    savePersonas(projectId, personas);

    return NextResponse.json({ personas });
  } catch (error) {
    console.error("Error generating personas:", error);
    return NextResponse.json(
      { error: "Failed to generate personas" },
      { status: 500 }
    );
  }
}

async function generatePersonas(
  projectId: string,
  audienceInfo: {
    ageRange?: string;
    role?: string;
    experienceLevel?: string;
    goals?: string;
    challenges?: string;
    additionalContext?: string;
  }
): Promise<Persona[]> {
  const prompt = `You are helping create realistic user personas for testing an AI assistant.

Audience Information:
- Age Range: ${audienceInfo.ageRange || "Not specified"}
- Role/Identity: ${audienceInfo.role || "Not specified"}
- Experience Level: ${audienceInfo.experienceLevel || "Not specified"}
- Goals: ${audienceInfo.goals || "Not specified"}
- Challenges: ${audienceInfo.challenges || "Not specified"}
- Additional Context: ${audienceInfo.additionalContext || "Not specified"}

Create 3-5 diverse, realistic personas that represent this audience. Each persona should be distinct and capture different aspects of the audience.

For each persona, provide:
1. **name**: A descriptive label (e.g., "Struggling High School Algebra Student", "Time-Constrained Marketing Manager")
2. **demographics**:
   - ageRange: Specific age range within the broader audience
   - role: Their specific role or identity
   - experienceLevel: Their experience level
3. **goals**: Array of 2-4 specific goals they want to achieve
4. **challenges**: Array of 2-4 specific challenges they face
5. **context**: A paragraph describing their behavioral traits, communication style, and how they would interact with an AI assistant

Make the personas realistic and varied - include different skill levels, motivations, and communication styles.

Format your response as a JSON array:
[
  {
    "name": "Persona name",
    "demographics": {
      "ageRange": "14-16",
      "role": "High school student",
      "experienceLevel": "Beginner"
    },
    "goals": ["Goal 1", "Goal 2"],
    "challenges": ["Challenge 1", "Challenge 2"],
    "context": "Behavioral description..."
  },
  ...
]

Provide ONLY the JSON array, no other text.`;

  try {
    const response = await callOpenAI(
      [{ role: "user", content: prompt }],
      "gpt-4-turbo-preview",
      0.7
    );

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse personas from AI response");
    }

    const parsedPersonas = JSON.parse(jsonMatch[0]);

    // Add IDs and metadata
    const personas: Persona[] = parsedPersonas.map((p: any, index: number) => ({
      id: `persona_${projectId}_${index}_${Date.now()}`,
      projectId,
      name: p.name,
      demographics: p.demographics || {},
      goals: p.goals || [],
      challenges: p.challenges || [],
      context: p.context || "",
      createdAt: new Date(),
    }));

    return personas;
  } catch (error) {
    console.error("Error generating personas:", error);
    // Return fallback personas
    return [
      {
        id: `persona_${projectId}_fallback_${Date.now()}`,
        projectId,
        name: "Typical User",
        demographics: {
          ageRange: audienceInfo.ageRange || "Unknown",
          role: audienceInfo.role || "User",
          experienceLevel: audienceInfo.experienceLevel || "Beginner",
        },
        goals: audienceInfo.goals ? [audienceInfo.goals] : ["Learn and improve"],
        challenges: audienceInfo.challenges
          ? [audienceInfo.challenges]
          : ["Understanding new concepts"],
        context:
          audienceInfo.additionalContext ||
          "A typical user looking for assistance with their goals.",
        createdAt: new Date(),
      },
    ];
  }
}
