"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Plus, Trash2 } from "lucide-react";
import { Project, Persona } from "@/lib/types";

export default function PersonasPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [showForm, setShowForm] = useState(true);

  // Form state
  const [audienceInfo, setAudienceInfo] = useState({
    ageRange: "",
    role: "",
    experienceLevel: "",
    goals: "",
    challenges: "",
    additionalContext: "",
  });

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects?id=${projectId}`);
      if (!response.ok) throw new Error("Failed to load project");

      const data = await response.json();
      setProject(data.project);

      // Check if personas already exist
      const personasResponse = await fetch(`/api/personas?projectId=${projectId}`);
      if (personasResponse.ok) {
        const personasData = await personasResponse.json();
        if (personasData.personas && personasData.personas.length > 0) {
          setPersonas(personasData.personas);
          setShowForm(false);
        }
      }
    } catch (error) {
      console.error("Error loading project:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePersonas = async () => {
    setGenerating(true);

    try {
      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          audienceInfo,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate personas");

      const data = await response.json();
      setPersonas(data.personas);
      setShowForm(false);

      // Save to session storage
      sessionStorage.setItem(`personas_${projectId}`, JSON.stringify(data.personas));
    } catch (error) {
      console.error("Error generating personas:", error);
      alert("Failed to generate personas. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const updatePersona = (id: string, field: keyof Persona, value: any) => {
    setPersonas(
      personas.map((p) => {
        if (p.id === id) {
          if (field === "demographics") {
            return { ...p, demographics: { ...p.demographics, ...value } };
          }
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  const deletePersona = (id: string) => {
    setPersonas(personas.filter((p) => p.id !== id));
  };

  const addPersona = () => {
    const newPersona: Persona = {
      id: `persona_${Date.now()}`,
      projectId,
      name: "",
      demographics: {},
      goals: [],
      challenges: [],
      context: "",
      createdAt: new Date(),
    };
    setPersonas([...personas, newPersona]);
  };

  const handleContinue = async () => {
    try {
      // Save personas
      await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, personas }),
      });

      // Navigate to calibration intro
      router.push(`/projects/${projectId}/calibration/intro`);
    } catch (error) {
      console.error("Error saving personas:", error);
      alert("Failed to save personas");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-background to-muted">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{project?.name}</h1>
          <p className="text-muted-foreground">Define Your Audience & Create Personas</p>
        </div>

        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                Tell Us About Your Audience
              </CardTitle>
              <CardDescription>
                We'll use this information to create realistic personas for testing your AI. Be specific - this helps generate better test conversations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ageRange">Age Range (optional)</Label>
                  <Input
                    id="ageRange"
                    placeholder="e.g., 14-16, 25-45, Adults"
                    value={audienceInfo.ageRange}
                    onChange={(e) => setAudienceInfo({ ...audienceInfo, ageRange: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role/Identity (optional)</Label>
                  <Input
                    id="role"
                    placeholder="e.g., High school student, Marketing manager"
                    value={audienceInfo.role}
                    onChange={(e) => setAudienceInfo({ ...audienceInfo, role: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="experienceLevel">Experience Level (optional)</Label>
                  <Input
                    id="experienceLevel"
                    placeholder="e.g., Beginner, Intermediate, Advanced"
                    value={audienceInfo.experienceLevel}
                    onChange={(e) => setAudienceInfo({ ...audienceInfo, experienceLevel: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">What are their goals?</Label>
                <Textarea
                  id="goals"
                  placeholder="What do they want to achieve? (e.g., Pass algebra exam, improve writing skills, learn marketing fundamentals)"
                  value={audienceInfo.goals}
                  onChange={(e) => setAudienceInfo({ ...audienceInfo, goals: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="challenges">What challenges do they face?</Label>
                <Textarea
                  id="challenges"
                  placeholder="What do they struggle with? (e.g., Understanding word problems, organizing thoughts, technical jargon)"
                  value={audienceInfo.challenges}
                  onChange={(e) => setAudienceInfo({ ...audienceInfo, challenges: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalContext">Additional Context</Label>
                <Textarea
                  id="additionalContext"
                  placeholder="Any other important details about your audience's behavior, background, or needs..."
                  value={audienceInfo.additionalContext}
                  onChange={(e) => setAudienceInfo({ ...audienceInfo, additionalContext: e.target.value })}
                  className="min-h-[100px]"
                />
                <p className="text-sm text-muted-foreground">
                  The more specific you are, the better the personas we can create.
                </p>
              </div>

              <Button
                onClick={generatePersonas}
                disabled={generating}
                size="lg"
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Personas...
                  </>
                ) : (
                  "Generate Personas"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Review & Edit Personas</CardTitle>
                <CardDescription>
                  We generated {personas.length} personas based on your audience description. Review and edit them as needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {personas.map((persona, index) => (
                  <Card key={persona.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold">Persona {index + 1}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePersona(persona.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label>Name/Description</Label>
                          <Input
                            value={persona.name}
                            onChange={(e) => updatePersona(persona.id, "name", e.target.value)}
                            placeholder="e.g., Struggling High School Algebra Student"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-sm">Age Range</Label>
                            <Input
                              value={persona.demographics.ageRange || ""}
                              onChange={(e) =>
                                updatePersona(persona.id, "demographics", { ageRange: e.target.value })
                              }
                              placeholder="e.g., 14-16"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Role</Label>
                            <Input
                              value={persona.demographics.role || ""}
                              onChange={(e) =>
                                updatePersona(persona.id, "demographics", { role: e.target.value })
                              }
                              placeholder="e.g., High school student"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Experience</Label>
                            <Input
                              value={persona.demographics.experienceLevel || ""}
                              onChange={(e) =>
                                updatePersona(persona.id, "demographics", { experienceLevel: e.target.value })
                              }
                              placeholder="e.g., Beginner"
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Context & Behavior</Label>
                          <Textarea
                            value={persona.context}
                            onChange={(e) => updatePersona(persona.id, "context", e.target.value)}
                            placeholder="Behavioral traits, communication style, specific needs..."
                            className="min-h-[80px]"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button variant="outline" className="w-full" onClick={addPersona}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Persona
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Back to Form
              </Button>
              <Button size="lg" onClick={handleContinue}>
                Continue to Calibration
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
