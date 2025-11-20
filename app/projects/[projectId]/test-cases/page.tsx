"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, MessageCircle, CheckCircle } from "lucide-react";
import { TestCase, Project, ConversationTurn } from "@/lib/types";

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
      turns: [
        { role: "user", content: "", evaluateAfter: false },
        { role: "user", content: "", evaluateAfter: false },
        { role: "user", content: "", evaluateAfter: true },
      ],
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

  const updateTurn = (testCaseId: string, turnIndex: number, content: string) => {
    setTestCases(
      testCases.map((tc) => {
        if (tc.id === testCaseId && tc.turns) {
          const newTurns = [...tc.turns];
          newTurns[turnIndex] = { ...newTurns[turnIndex], content };
          return { ...tc, turns: newTurns };
        }
        return tc;
      })
    );
  };

  const toggleCheckpoint = (testCaseId: string, turnIndex: number) => {
    setTestCases(
      testCases.map((tc) => {
        if (tc.id === testCaseId && tc.turns) {
          const newTurns = [...tc.turns];
          newTurns[turnIndex] = {
            ...newTurns[turnIndex],
            evaluateAfter: !newTurns[turnIndex].evaluateAfter,
          };
          return { ...tc, turns: newTurns };
        }
        return tc;
      })
    );
  };

  const addTurn = (testCaseId: string) => {
    setTestCases(
      testCases.map((tc) => {
        if (tc.id === testCaseId && tc.turns) {
          return {
            ...tc,
            turns: [...tc.turns, { role: "user", content: "", evaluateAfter: false }],
          };
        }
        return tc;
      })
    );
  };

  const deleteTurn = (testCaseId: string, turnIndex: number) => {
    setTestCases(
      testCases.map((tc) => {
        if (tc.id === testCaseId && tc.turns && tc.turns.length > 1) {
          const newTurns = tc.turns.filter((_, idx) => idx !== turnIndex);
          return { ...tc, turns: newTurns };
        }
        return tc;
      })
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
            <CardTitle>Review Test Conversations</CardTitle>
            <CardDescription>
              We generated {testCases.length} multi-turn conversation test cases. Review, edit turns, mark checkpoints, or add more before running evaluations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testCases.map((testCase, index) => {
              const turns = testCase.turns || [{ role: "user" as const, content: testCase.input || "", evaluateAfter: true }];

              return (
                <Card key={testCase.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Conversation {index + 1}</h3>
                        <span className="text-sm text-muted-foreground">({turns.length} turns)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTestCase(testCase.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {turns.map((turn, turnIdx) => (
                        <div key={turnIdx} className="relative pl-4 border-l-2 border-primary/20">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                Turn {turnIdx + 1}
                              </span>
                              <button
                                onClick={() => toggleCheckpoint(testCase.id, turnIdx)}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                                  turn.evaluateAfter
                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                                title={turn.evaluateAfter ? "Checkpoint enabled" : "Click to mark as checkpoint"}
                              >
                                <CheckCircle className="h-3 w-3" />
                                {turn.evaluateAfter ? "Checkpoint" : "No checkpoint"}
                              </button>
                            </div>
                            {turns.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTurn(testCase.id, turnIdx)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <Textarea
                            value={turn.content}
                            onChange={(e) => updateTurn(testCase.id, turnIdx, e.target.value)}
                            placeholder={`Student message ${turnIdx + 1}...`}
                            className="min-h-[60px]"
                          />
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => addTurn(testCase.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Turn
                      </Button>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <label className="text-sm font-medium mb-2 block">
                        Expected Behavior (across conversation)
                      </label>
                      <Textarea
                        value={testCase.expectedBehavior || ""}
                        onChange={(e) =>
                          updateTestCase(testCase.id, "expectedBehavior", e.target.value)
                        }
                        placeholder="What should the AI do well across this conversation?"
                        className="min-h-[60px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Button
              variant="outline"
              className="w-full"
              onClick={addTestCase}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Conversation
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
