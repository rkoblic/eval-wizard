"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Download, User, Bot, MessageCircle } from "lucide-react";
import { EvalRun, ConversationResult, Project, TestCase, EDUCATION_CRITERIA } from "@/lib/types";

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const evalRunId = params.evalRunId as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [evalRun, setEvalRun] = useState<EvalRun | null>(null);
  const [results, setResults] = useState<ConversationResult[]>([]);
  const [expandedTestCase, setExpandedTestCase] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (evalRun?.status === "running") {
        loadEvalRun();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [projectId, evalRunId]);

  const loadData = async () => {
    await Promise.all([loadProject(), loadEvalRun()]);
    setLoading(false);
  };

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects?id=${projectId}`);
      if (!response.ok) throw new Error("Failed to load project");

      const data = await response.json();
      setProject(data.project);
      setTestCases(data.testCases);
    } catch (error) {
      console.error("Error loading project:", error);
    }
  };

  const loadEvalRun = async () => {
    try {
      // First check session storage for batched results
      const sessionResults = sessionStorage.getItem(`eval_results_${evalRunId}`);
      const sessionCriteria = sessionStorage.getItem(`criteria_${projectId}`);

      if (sessionResults && sessionCriteria) {
        // Load from session storage (batched evaluation)
        const parsedResults = JSON.parse(sessionResults);
        const criteriaIds = JSON.parse(sessionCriteria);

        setResults(parsedResults);
        setEvalRun({
          id: evalRunId,
          projectId,
          status: "completed",
          criteriaIds,
          createdAt: new Date(),
          completedAt: new Date(),
        });
      } else {
        // Try to load from API (old method)
        const response = await fetch(`/api/eval-runs?id=${evalRunId}`);
        if (!response.ok) throw new Error("Failed to load eval run");

        const data = await response.json();
        setEvalRun(data.evalRun);
        setResults(data.results);
      }
    } catch (error) {
      console.error("Error loading eval run:", error);
    }
  };

  const exportToCSV = () => {
    // Prepare CSV data with conversation context
    const headers = ["Conversation", "Turns", "Criterion", "Pass/Fail", "Reasoning", "Checkpoint/Final"];
    const rows: string[][] = [];

    results.forEach((convResult) => {
      const testCase = testCases.find((tc) => tc.id === convResult.testCaseId);
      const turns = testCase?.turns || [{ role: "user" as const, content: testCase?.input || "", evaluateAfter: true }];
      const conversationSummary = turns[0]?.content.substring(0, 100) + "...";
      const turnCount = turns.length.toString();

      // Add checkpoint evaluations
      convResult.checkpointEvaluations.forEach((evaluation) => {
        const criterion = EDUCATION_CRITERIA.find((c) => c.id === evaluation.criterionId);
        rows.push([
          conversationSummary,
          turnCount,
          criterion?.name || "",
          evaluation.pass ? "PASS" : "FAIL",
          evaluation.reasoning,
          `Checkpoint (Turn ${evaluation.afterTurnIndex + 1})`,
        ]);
      });

      // Add final evaluations
      convResult.finalEvaluation.forEach((evaluation) => {
        const criterion = EDUCATION_CRITERIA.find((c) => c.id === evaluation.criterionId);
        rows.push([
          conversationSummary,
          turnCount,
          criterion?.name || "",
          evaluation.pass ? "PASS" : "FAIL",
          evaluation.reasoning,
          "Final",
        ]);
      });
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eval-conversation-results-${projectId}-${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (evalRun?.status === "running") {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col space-y-4">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="text-lg font-medium">Running evaluations...</p>
        <p className="text-muted-foreground">
          Testing {testCases.length} cases across {evalRun.criteriaIds.length} criteria
        </p>
      </div>
    );
  }

  // Flatten results for statistics (extract finalEvaluation from each conversation)
  const flattenedResults = results.flatMap((convResult) =>
    convResult.finalEvaluation.map((evaluation) => ({
      testCaseId: convResult.testCaseId,
      criterionId: evaluation.criterionId,
      pass: evaluation.pass,
      reasoning: evaluation.reasoning,
    }))
  );

  // Calculate statistics
  const totalTests = flattenedResults.length;
  const passedTests = flattenedResults.filter((r) => r.pass).length;
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  // Group results by criterion
  const resultsByCriterion = evalRun?.criteriaIds.map((criterionId) => {
    const criterion = EDUCATION_CRITERIA.find((c) => c.id === criterionId);
    const criterionResults = flattenedResults.filter((r) => r.criterionId === criterionId);
    const passed = criterionResults.filter((r) => r.pass).length;
    const total = criterionResults.length;

    return {
      criterion,
      passed,
      total,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
    };
  }) || [];

  // Group results by test case
  const resultsByTestCase = testCases.map((testCase) => {
    const convResult = results.find((r) => r.testCaseId === testCase.id);
    if (!convResult) {
      return {
        testCase,
        convResult: null,
        passed: 0,
        total: 0,
      };
    }

    const passed = convResult.finalEvaluation.filter((e) => e.pass).length;
    const total = convResult.finalEvaluation.length;

    return {
      testCase,
      convResult,
      passed,
      total,
    };
  });

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-background to-muted">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{project?.name}</h1>
          <p className="text-muted-foreground">Evaluation Results</p>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Overall Pass Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{passRate}%</div>
              <p className="text-sm text-muted-foreground mt-2">
                {passedTests} / {totalTests} tests passed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{testCases.length}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Total test scenarios
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{evalRun?.criteriaIds.length}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Evaluation dimensions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Results by Criterion */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Criterion</CardTitle>
            <CardDescription>
              How well your AI performed on each evaluation dimension
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resultsByCriterion.map((item) => (
              <div key={item.criterion?.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">{item.criterion?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.criterion?.description}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold">{item.passRate}%</p>
                    <p className="text-sm text-muted-foreground">
                      {item.passed}/{item.total}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${item.passRate}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Detailed Test Case Results */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Conversation Results</CardTitle>
            <CardDescription>
              Click on any conversation to see the full dialogue, AI responses, and evaluation details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resultsByTestCase.map((item, index) => {
              if (!item.convResult) return null;

              const turns = item.testCase.turns || [{ role: "user" as const, content: item.testCase.input || "", evaluateAfter: true }];

              return (
                <Card
                  key={item.testCase.id}
                  className="border-2 cursor-pointer hover:border-primary/50"
                  onClick={() =>
                    setExpandedTestCase(
                      expandedTestCase === item.testCase.id ? null : item.testCase.id
                    )
                  }
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Conversation {index + 1}</h3>
                        <span className="text-sm text-muted-foreground">({turns.length} turns)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {item.passed}/{item.total} passed
                        </span>
                        {item.passed === item.total ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          First Student Message:
                        </p>
                        <p className="mt-1">{turns[0]?.content}</p>
                      </div>

                      {expandedTestCase === item.testCase.id && (
                        <div className="space-y-4 mt-4 pt-4 border-t">
                          {/* Full Conversation */}
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-3">
                              Full Conversation:
                            </p>
                            <div className="space-y-3">
                              {item.convResult.conversation.map((msg, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-start gap-3 ${
                                    msg.role === "assistant" ? "bg-muted/50 p-3 rounded-lg" : ""
                                  }`}
                                >
                                  {msg.role === "user" ? (
                                    <User className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                                  ) : (
                                    <Bot className="h-5 w-5 mt-1 text-purple-500 flex-shrink-0" />
                                  )}
                                  <div className="flex-1">
                                    <p className="text-xs font-medium mb-1 text-muted-foreground">
                                      {msg.role === "user" ? "Student" : "AI Assistant"}
                                    </p>
                                    <p className="text-sm">{msg.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Checkpoint Evaluations */}
                          {item.convResult.checkpointEvaluations.length > 0 && (
                            <div className="pt-4 border-t">
                              <p className="text-sm font-medium mb-3">Checkpoint Evaluations:</p>
                              <div className="space-y-3">
                                {item.convResult.checkpointEvaluations.map((evaluation, idx) => {
                                  const criterion = EDUCATION_CRITERIA.find(
                                    (c) => c.id === evaluation.criterionId
                                  );
                                  return (
                                    <div
                                      key={idx}
                                      className={`p-3 rounded-md border-2 ${
                                        evaluation.pass
                                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                                          : "border-orange-500 bg-orange-50 dark:bg-orange-950"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <p className="font-semibold">{criterion?.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            After turn {evaluation.afterTurnIndex + 1}
                                          </p>
                                        </div>
                                        {evaluation.pass ? (
                                          <CheckCircle2 className="h-5 w-5 text-blue-500" />
                                        ) : (
                                          <XCircle className="h-5 w-5 text-orange-500" />
                                        )}
                                      </div>
                                      <p className="text-sm">{evaluation.reasoning}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Final Evaluations */}
                          <div className="pt-4 border-t">
                            <p className="text-sm font-medium mb-3">Final Judge Evaluations:</p>
                            <div className="space-y-3">
                              {item.convResult.finalEvaluation.map((evaluation) => {
                                const criterion = EDUCATION_CRITERIA.find(
                                  (c) => c.id === evaluation.criterionId
                                );
                                return (
                                  <div
                                    key={evaluation.criterionId}
                                    className={`p-3 rounded-md border-2 ${
                                      evaluation.pass
                                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                                        : "border-red-500 bg-red-50 dark:bg-red-950"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="font-semibold">{criterion?.name}</p>
                                      {evaluation.pass ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                      ) : (
                                        <XCircle className="h-5 w-5 text-red-500" />
                                      )}
                                    </div>
                                    <p className="text-sm">{evaluation.reasoning}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/")}>
            Create New Evaluation
          </Button>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
        </div>
      </div>
    </main>
  );
}
