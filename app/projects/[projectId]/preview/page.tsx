"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, ArrowRight, MessageCircle, User, Bot } from "lucide-react";
import { Project, TestCase, EDUCATION_CRITERIA, ConversationTurn, ConversationMessage } from "@/lib/types";

interface PreviewResult {
  testCase: {
    id: string;
    turns: ConversationTurn[];
    expectedBehavior?: string;
  };
  conversation: ConversationMessage[];
  checkpointEvaluations: Array<{
    checkpointTurn: number;
    criterionId: string;
    criterionName: string;
    pass: boolean;
    reasoning: string;
  }>;
  finalEvaluations: Array<{
    checkpointTurn: number;
    criterionId: string;
    criterionName: string;
    pass: boolean;
    reasoning: string;
  }>;
}

export default function PreviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>("");
  const [criteriaIds, setCriteriaIds] = useState<string[]>([]);
  const [result, setResult] = useState<PreviewResult | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      // First try to load from session storage (for serverless environment)
      const storedProject = sessionStorage.getItem(`project_${projectId}`);
      const storedTestCases = sessionStorage.getItem(`test_cases_${projectId}`);
      const storedCriteria = sessionStorage.getItem(`criteria_${projectId}`);

      if (storedProject && storedTestCases) {
        // Load from session storage
        const project = JSON.parse(storedProject);
        const testCases = JSON.parse(storedTestCases);

        setProject(project);
        setTestCases(testCases);

        // Default to first test case
        if (testCases.length > 0) {
          setSelectedTestCaseId(testCases[0].id);
        }

        if (storedCriteria) {
          setCriteriaIds(JSON.parse(storedCriteria));
        }
      } else {
        // Fallback to API if session storage is empty
        const response = await fetch(`/api/projects?id=${projectId}`);
        if (!response.ok) throw new Error("Failed to load project");

        const data = await response.json();
        setProject(data.project);
        setTestCases(data.testCases);

        // Default to first test case
        if (data.testCases.length > 0) {
          setSelectedTestCaseId(data.testCases[0].id);
        }

        // Get criteria from session storage
        if (storedCriteria) {
          setCriteriaIds(JSON.parse(storedCriteria));
        }

        // Save to session storage for future use
        if (data.project) {
          sessionStorage.setItem(`project_${projectId}`, JSON.stringify(data.project));
        }
        if (data.testCases) {
          sessionStorage.setItem(`test_cases_${projectId}`, JSON.stringify(data.testCases));
        }
      }
    } catch (error) {
      console.error("Error loading project:", error);
    } finally {
      setLoading(false);
    }
  };

  const runPreview = async () => {
    if (!selectedTestCaseId) return;

    setRunning(true);
    setResult(null);

    try {
      const response = await fetch(`/api/eval-runs/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          testCaseId: selectedTestCaseId,
          criteriaIds,
        }),
      });

      if (!response.ok) throw new Error("Failed to run preview");

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error running preview:", error);
      alert("Failed to run preview evaluation");
    } finally {
      setRunning(false);
    }
  };

  const runFullEvaluation = () => {
    // Navigate to full evaluation with batching
    router.push(`/projects/${projectId}/evaluate`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const selectedTestCase = testCases.find((tc) => tc.id === selectedTestCaseId);
  const passedCount = result?.finalEvaluations.filter((j) => j.pass).length || 0;
  const totalCount = result?.finalEvaluations.length || 0;
  const turns = selectedTestCase?.turns || [{ role: "user" as const, content: selectedTestCase?.input || "", evaluateAfter: true }];

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-background to-muted">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{project?.name}</h1>
          <p className="text-muted-foreground">Preview Evaluation</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Run a Quick Test</CardTitle>
            <CardDescription>
              Evaluate one test case across all {criteriaIds.length} criteria to verify everything is working correctly.
              This takes about 5-10 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Conversation</label>
              <select
                value={selectedTestCaseId}
                onChange={(e) => setSelectedTestCaseId(e.target.value)}
                className="w-full p-3 border rounded-md bg-background"
              >
                {testCases.map((tc, index) => {
                  const tcTurns = tc.turns || [{ role: "user" as const, content: tc.input || "", evaluateAfter: true }];
                  const firstTurn = tcTurns[0]?.content || "";
                  return (
                    <option key={tc.id} value={tc.id}>
                      Conversation {index + 1} ({tcTurns.length} turns): {firstTurn.substring(0, 50)}...
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedTestCase && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium mb-2">Conversation Preview ({turns.length} turns):</p>
                {turns.map((turn, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <User className="h-4 w-4 mt-0.5 text-primary" />
                    <p className="flex-1">{turn.content}</p>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={runPreview}
              disabled={running || !selectedTestCaseId}
              className="w-full"
              size="lg"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Preview...
                </>
              ) : (
                "Run Preview Evaluation"
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Conversation & AI Responses</CardTitle>
                <CardDescription>
                  Full conversation between student and AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.conversation.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${
                      msg.role === "assistant" ? "bg-muted/50 p-4 rounded-lg" : ""
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    ) : (
                      <Bot className="h-5 w-5 mt-1 text-purple-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">
                        {msg.role === "user" ? "Student" : "AI Assistant"}
                      </p>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {result.checkpointEvaluations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Checkpoint Evaluations</CardTitle>
                  <CardDescription>
                    Evaluations at key conversation milestones
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.checkpointEvaluations.map((evaluation, idx) => {
                    const criterion = EDUCATION_CRITERIA.find(
                      (c) => c.id === evaluation.criterionId
                    );
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border-2 ${
                          evaluation.pass
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                            : "border-orange-500 bg-orange-50 dark:bg-orange-950"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold">{evaluation.criterionName}</p>
                            <p className="text-xs text-muted-foreground">
                              After turn {evaluation.checkpointTurn + 1}
                            </p>
                          </div>
                          {evaluation.pass ? (
                            <CheckCircle2 className="h-5 w-5 text-blue-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-orange-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {criterion?.description}
                        </p>
                        <p className="text-sm">{evaluation.reasoning}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Final Evaluation Results</CardTitle>
                <CardDescription>
                  {passedCount} of {totalCount} criteria passed overall
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.finalEvaluations.map((judgment) => {
                  const criterion = EDUCATION_CRITERIA.find(
                    (c) => c.id === judgment.criterionId
                  );
                  return (
                    <div
                      key={judgment.criterionId}
                      className={`p-4 rounded-lg border-2 ${
                        judgment.pass
                          ? "border-green-500 bg-green-50 dark:bg-green-950"
                          : "border-red-500 bg-red-50 dark:bg-red-950"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{judgment.criterionName}</p>
                        {judgment.pass ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {criterion?.description}
                      </p>
                      <p className="text-sm">{judgment.reasoning}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Ready to run full evaluation?</h3>
                    <p className="text-sm text-muted-foreground">
                      Evaluate all {testCases.length} test cases across {criteriaIds.length} criteria
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/projects/${projectId}/criteria`)}
                    >
                      Adjust Criteria
                    </Button>
                    <Button onClick={runFullEvaluation} size="lg">
                      Run Full Evaluation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}/criteria`)}
          >
            Back to Criteria
          </Button>
        </div>
      </div>
    </main>
  );
}
