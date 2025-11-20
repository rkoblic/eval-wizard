"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Project, EDUCATION_CRITERIA } from "@/lib/types";

export default function CriteriaPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(
    EDUCATION_CRITERIA.map((c) => c.id)
  );

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects?id=${projectId}`);
      if (!response.ok) throw new Error("Failed to load project");

      const data = await response.json();
      setProject(data.project);
    } catch (error) {
      console.error("Error loading project:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCriterion = (criterionId: string) => {
    setSelectedCriteria((prev) =>
      prev.includes(criterionId)
        ? prev.filter((id) => id !== criterionId)
        : [...prev, criterionId]
    );
  };

  const handlePreview = () => {
    if (selectedCriteria.length === 0) {
      alert("Please select at least one criterion");
      return;
    }

    // Store criteria in session storage for preview page
    sessionStorage.setItem(`criteria_${projectId}`, JSON.stringify(selectedCriteria));

    // Navigate to preview
    router.push(`/projects/${projectId}/preview`);
  };

  const handleRunEval = async () => {
    if (selectedCriteria.length === 0) {
      alert("Please select at least one criterion");
      return;
    }

    // Store criteria in session storage
    sessionStorage.setItem(`criteria_${projectId}`, JSON.stringify(selectedCriteria));

    // Navigate to full evaluation
    router.push(`/projects/${projectId}/evaluate`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-background to-muted">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{project?.name}</h1>
          <p className="text-muted-foreground">{project?.description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Evaluation Criteria</CardTitle>
            <CardDescription>
              Choose the criteria you want to evaluate your AI tool against.
              All criteria are education-focused and designed for teaching contexts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {EDUCATION_CRITERIA.map((criterion) => (
              <div
                key={criterion.id}
                className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleCriterion(criterion.id)}
              >
                <Checkbox
                  id={criterion.id}
                  checked={selectedCriteria.includes(criterion.id)}
                  onCheckedChange={() => toggleCriterion(criterion.id)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={criterion.id}
                    className="text-base font-semibold cursor-pointer"
                  >
                    {criterion.name}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {criterion.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-lg">
                  {selectedCriteria.length} criteria selected
                </p>
                <p className="text-sm text-muted-foreground">
                  Ready to evaluate your AI tool
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handlePreview}
                  disabled={selectedCriteria.length === 0}
                  className="flex-1"
                >
                  Preview Evaluation
                  <span className="ml-2 text-xs bg-primary/10 px-2 py-0.5 rounded">
                    ~10 sec
                  </span>
                </Button>
                <Button
                  size="lg"
                  onClick={handleRunEval}
                  disabled={selectedCriteria.length === 0}
                  className="flex-1"
                >
                  Run Full Evaluation
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                💡 Try a preview first to verify your criteria are working correctly
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}/test-cases`)}
          >
            Back to Test Cases
          </Button>
        </div>
      </div>
    </main>
  );
}
