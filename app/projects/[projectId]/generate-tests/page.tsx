"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, Sparkles } from "lucide-react";

export default function GenerateTestsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [generating, setGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 50 });

  useEffect(() => {
    generateTests();
  }, [projectId]);

  const generateTests = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/test-cases/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          count: 50, // Generate 50 diverse test cases
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate test cases");
      }

      const data = await response.json();
      console.log(`Generated ${data.testCases.length} test cases`);

      // Wait a moment before redirecting
      setTimeout(() => {
        router.push(`/projects/${projectId}/eval-setup`);
      }, 1500);
    } catch (error) {
      console.error("Error generating tests:", error);
      setError(error instanceof Error ? error.message : "Failed to generate test cases");
    } finally {
      setGenerating(false);
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="max-w-md w-full border-2 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Generation Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={generateTests} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                "Try Again"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}/calibration/analyze`)}
              className="w-full"
            >
              Back to Calibration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!generating) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="max-w-md w-full border-2 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-green-900">Test Cases Generated!</h2>
                <p className="text-sm text-green-700">
                  Your test suite is ready. Redirecting to evaluation setup...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-b from-background to-muted">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Generating Test Suite
          </CardTitle>
          <CardDescription>
            Creating diverse test cases based on your personas and quality criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Generating realistic conversations across your personas...
              </p>
              <p className="text-xs text-muted-foreground">
                This may take 1-2 minutes
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Loaded personas and quality criteria</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Creating 50 diverse test scenarios...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
