"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Project, TestCase, ConversationResult } from "@/lib/types";

const BATCH_SIZE = 2; // Process 2 test cases at a time to stay under serverless timeout

export default function EvaluatePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [criteriaIds, setCriteriaIds] = useState<string[]>([]);
  const [results, setResults] = useState<ConversationResult[]>([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    if (!loading && testCases.length > 0 && criteriaIds.length > 0) {
      // Auto-start evaluation
      startEvaluation();
    }
  }, [loading]);

  const loadData = async () => {
    try {
      // First try to load from session storage
      const storedProject = sessionStorage.getItem(`project_${projectId}`);
      const storedTestCases = sessionStorage.getItem(`test_cases_${projectId}`);
      const storedCriteria = sessionStorage.getItem(`criteria_${projectId}`);

      if (storedProject && storedTestCases) {
        // Load from session storage
        const project = JSON.parse(storedProject);
        const testCases = JSON.parse(storedTestCases);

        setProject(project);
        setTestCases(testCases);

        if (storedCriteria) {
          setCriteriaIds(JSON.parse(storedCriteria));
        }

        const batches = Math.ceil(testCases.length / BATCH_SIZE);
        setTotalBatches(batches);
      } else {
        // Fallback to API
        const response = await fetch(`/api/projects?id=${projectId}`);
        if (!response.ok) throw new Error("Failed to load project");

        const data = await response.json();
        setProject(data.project);
        setTestCases(data.testCases);

        if (storedCriteria) {
          setCriteriaIds(JSON.parse(storedCriteria));
        }

        const batches = Math.ceil(data.testCases.length / BATCH_SIZE);
        setTotalBatches(batches);

        // Save to session storage
        if (data.project) {
          sessionStorage.setItem(`project_${projectId}`, JSON.stringify(data.project));
        }
        if (data.testCases) {
          sessionStorage.setItem(`test_cases_${projectId}`, JSON.stringify(data.testCases));
        }
      }
    } catch (error) {
      console.error("Error loading project:", error);
      setError("Failed to load project data");
    } finally {
      setLoading(false);
    }
  };

  const startEvaluation = async () => {
    setEvaluating(true);
    setError(null);

    const allResults: ConversationResult[] = [];

    try {
      // Process test cases in batches
      for (let i = 0; i < testCases.length; i += BATCH_SIZE) {
        const batch = testCases.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

        setCurrentBatch(batchNumber);

        console.log(`Processing batch ${batchNumber}/${totalBatches}`);

        try {
          const response = await fetch(`/api/eval-runs/batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              testCaseIds: batch.map((tc) => tc.id),
              criteriaIds,
            }),
          });

          if (!response.ok) {
            throw new Error(`Batch ${batchNumber} failed`);
          }

          const data = await response.json();
          allResults.push(...data.results);
          setResults([...allResults]); // Update results progressively
        } catch (batchError) {
          console.error(`Error in batch ${batchNumber}:`, batchError);
          setError(`Failed at batch ${batchNumber} of ${totalBatches}`);
          // Continue to next batch
        }
      }

      // Store final results
      const evalRunId = `eval_${Date.now()}`;
      sessionStorage.setItem(`eval_results_${evalRunId}`, JSON.stringify(allResults));

      // Navigate to results page
      router.push(`/projects/${projectId}/results/${evalRunId}`);
    } catch (error) {
      console.error("Error during evaluation:", error);
      setError("Evaluation failed. Please try again.");
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const progress = totalBatches > 0 ? Math.round((currentBatch / totalBatches) * 100) : 0;
  const processedTestCases = Math.min(currentBatch * BATCH_SIZE, testCases.length);

  return (
    <main className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-b from-background to-muted">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{project?.name}</CardTitle>
          <CardDescription>Running Full Evaluation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {evaluating && !error && (
            <>
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="text-center space-y-2">
                  <p className="text-xl font-semibold">
                    Processing batch {currentBatch} of {totalBatches}
                  </p>
                  <p className="text-muted-foreground">
                    {processedTestCases} of {testCases.length} test cases evaluated
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {criteriaIds.length} criteria per test case
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="text-sm text-muted-foreground text-center">
                <p>This may take 2-5 minutes depending on the number of test cases.</p>
                <p>Please keep this tab open.</p>
              </div>
            </>
          )}

          {error && (
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-16 w-16 text-destructive" />
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-destructive">Error</p>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/criteria`)}>
                  Back to Criteria
                </Button>
                <Button onClick={startEvaluation}>Retry Evaluation</Button>
              </div>
            </div>
          )}

          {!evaluating && !error && results.length > 0 && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold">Evaluation Complete!</p>
                <p className="text-muted-foreground">
                  Processed {results.length} evaluations
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
