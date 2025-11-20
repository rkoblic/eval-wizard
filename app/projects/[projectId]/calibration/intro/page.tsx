"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Target, Brain, CheckCircle, ArrowRight } from "lucide-react";
import { Project } from "@/lib/types";

export default function CalibrationIntroPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

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

  const startCalibration = async () => {
    setGenerating(true);

    try {
      // Generate 10 training conversations based on personas
      const response = await fetch("/api/calibration/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) throw new Error("Failed to generate training conversations");

      // Navigate to grading interface
      router.push(`/projects/${projectId}/calibration/grade`);
    } catch (error) {
      console.error("Error generating conversations:", error);
      alert("Failed to generate training conversations. Please try again.");
    } finally {
      setGenerating(false);
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
    <main className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-b from-background to-muted">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">{project?.name}</h1>
          <p className="text-xl text-muted-foreground">Train Your AI Judge</p>
        </div>

        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Brain className="h-7 w-7" />
              Help Us Learn What "Good" Looks Like
            </CardTitle>
            <CardDescription className="text-base">
              You're about to grade 10 sample conversations. This trains a personalized AI judge that
              understands YOUR quality standards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Review 10 Conversations</h3>
                  <p className="text-sm text-muted-foreground">
                    We'll show you realistic conversations between your personas and your AI,
                    one at a time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Grade Each One</h3>
                  <p className="text-sm text-muted-foreground">
                    Mark each conversation as Pass or Fail, then explain why in your own words.
                    This captures what matters to you.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">We Create Your Custom Judge</h3>
                  <p className="text-sm text-muted-foreground">
                    Your feedback is analyzed to create personalized quality criteria and train
                    an AI judge that evaluates like you would.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <p className="font-medium">Time Commitment</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This takes 5-10 minutes, but it makes all future evaluations much more accurate and
                aligned with your standards.
              </p>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <p className="font-medium">You Can Pause Anytime</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your progress is auto-saved after each grade. Feel free to take a break and come
                back later.
              </p>
            </div>

            <Button
              onClick={startCalibration}
              disabled={generating}
              size="lg"
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Conversations...
                </>
              ) : (
                <>
                  Start Calibration
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => router.push(`/projects/${projectId}/personas`)}
          >
            Back to Personas
          </Button>
        </div>
      </div>
    </main>
  );
}
