"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { TestCase, Project } from "@/lib/types";

export default function TestCasesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects?id=${projectId}`);
      if (!response.ok) throw new Error("Failed to load project");

      const data = await response.json();
      setProject(data.project);
      setTestCases(data.testCases);

      // Save to session storage for serverless environment
      if (data.project) {
        sessionStorage.setItem(`project_${projectId}`, JSON.stringify(data.project));
      }
      if (data.testCases) {
        sessionStorage.setItem(`test_cases_${projectId}`, JSON.stringify(data.testCases));
      }
    } catch (error) {
      console.error("Error loading project:", error);
      alert("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const addTestCase = () => {
    const newTestCase: TestCase = {
      id: `test_${Date.now()}`,
      projectId,
      input: "",
      expectedBehavior: "",
      source: "manual",
      createdAt: new Date(),
    };
    setTestCases([...testCases, newTestCase]);
    setEditingId(newTestCase.id);
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: string) => {
    setTestCases(
      testCases.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  };

  const deleteTestCase = (id: string) => {
    setTestCases(testCases.filter((tc) => tc.id !== id));
  };

  const handleContinue = async () => {
    // Save test cases and proceed to criteria selection
    try {
      // Save to API (server storage)
      await fetch(`/api/test-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, testCases }),
      });

      // Also save to session storage as backup for serverless environment
      sessionStorage.setItem(`test_cases_${projectId}`, JSON.stringify(testCases));

      router.push(`/projects/${projectId}/criteria`);
    } catch (error) {
      console.error("Error saving test cases:", error);
      alert("Failed to save test cases");
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
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{project?.name}</h1>
          <p className="text-muted-foreground">{project?.description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Review Test Cases</CardTitle>
            <CardDescription>
              We generated {testCases.length} test cases. Review, edit, or add more before running evaluations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testCases.map((testCase, index) => (
              <Card key={testCase.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold">Test Case {index + 1}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTestCase(testCase.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Student Query
                      </label>
                      {editingId === testCase.id ? (
                        <Textarea
                          value={testCase.input}
                          onChange={(e) =>
                            updateTestCase(testCase.id, "input", e.target.value)
                          }
                          onBlur={() => setEditingId(null)}
                          autoFocus
                          className="min-h-[80px]"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingId(testCase.id)}
                          className="p-3 border rounded-md cursor-pointer hover:bg-muted/50 min-h-[80px]"
                        >
                          {testCase.input || "Click to edit..."}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Expected Behavior
                      </label>
                      {editingId === testCase.id ? (
                        <Textarea
                          value={testCase.expectedBehavior || ""}
                          onChange={(e) =>
                            updateTestCase(
                              testCase.id,
                              "expectedBehavior",
                              e.target.value
                            )
                          }
                          className="min-h-[60px]"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingId(testCase.id)}
                          className="p-3 border rounded-md cursor-pointer hover:bg-muted/50 min-h-[60px] text-sm text-muted-foreground"
                        >
                          {testCase.expectedBehavior || "Click to edit..."}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={addTestCase}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Test Case
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/")}>
            Back
          </Button>
          <Button size="lg" onClick={handleContinue}>
            Continue to Evaluation Criteria
          </Button>
        </div>
      </div>
    </main>
  );
}
