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

  const handleRunEval = async () => {
    if (selectedCriteria.length === 0) {
      alert("Please select at least one criterion");
      return;
    }

    // Create eval run
    try {
      const response = await fetch(`/api/eval-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          criteriaIds: selectedCriteria,
        }),
      });

      if (!response.ok) throw new Error("Failed to create eval run");

      const { evalRunId } = await response.json();

      // Redirect to results page
      router.push(`/projects/${projectId}/results/${evalRunId}`);
    } catch (error) {
      console.error("Error creating eval run:", error);
      alert("Failed to start evaluation");
    }
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

        <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
          <div>
            <p className="font-semibold">
              {selectedCriteria.length} criteria selected
            </p>
            <p className="text-sm text-muted-foreground">
              Evaluations will run on all test cases
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleRunEval}
            disabled={selectedCriteria.length === 0}
          >
            Run Evaluation
          </Button>
        </div>

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
