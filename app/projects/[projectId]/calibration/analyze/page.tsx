"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, Sparkles, Edit2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { CalibrationResult, CustomCriterion, HumanGradedConversation } from "@/lib/types";

export default function CalibrationAnalyzePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [analyzing, setAnalyzing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [editingCriteria, setEditingCriteria] = useState<CustomCriterion[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  useEffect(() => {
    analyzeCalibration();
  }, [projectId]);

  const analyzeCalibration = async () => {
    setAnalyzing(true);

    try {
      // Call analysis API
      const response = await fetch("/api/calibration/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze calibration");
      }

      const data = await response.json();
      setResult(data.calibrationResult);
      setEditingCriteria(data.calibrationResult.customCriteria);
    } catch (error) {
      console.error("Error analyzing calibration:", error);
      alert("Failed to analyze your feedback. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);

    try {
      // Save edited criteria if in edit mode
      if (editMode && result) {
        const updatedResult = {
          ...result,
          customCriteria: editingCriteria,
          approvedByUser: true,
        };

        // Save to backend
        await fetch("/api/calibration/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            calibrationResult: updatedResult,
          }),
        });
      } else {
        // Just mark as approved
        await fetch("/api/calibration/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            calibrationResult: { ...result, approvedByUser: true },
          }),
        });
      }

      // Navigate to test case generation
      router.push(`/projects/${projectId}/generate-tests`);
    } catch (error) {
      console.error("Error approving criteria:", error);
      alert("Failed to save approval. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateCriterion = (index: number, field: keyof CustomCriterion, value: string) => {
    const updated = [...editingCriteria];
    updated[index] = { ...updated[index], [field]: value };
    setEditingCriteria(updated);
  };

  const addCriterion = () => {
    setEditingCriteria([
      ...editingCriteria,
      {
        id: `criterion_custom_${Date.now()}`,
        name: "New Criterion",
        description: "",
        derivedFrom: "Manually added by user",
      },
    ]);
  };

  const removeCriterion = (index: number) => {
    const updated = editingCriteria.filter((_, idx) => idx !== index);
    setEditingCriteria(updated);
  };

  if (analyzing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Analyzing Your Feedback</h2>
                <p className="text-sm text-muted-foreground">
                  We're learning from your quality standards to create personalized evaluation
                  criteria...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card>
          <CardHeader>
            <CardTitle>Analysis Failed</CardTitle>
            <CardDescription>
              Unable to analyze calibration data. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/projects/${projectId}/calibration/grade`)}>
              Back to Grading
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-background to-muted">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Your Custom Quality Criteria</h1>
          </div>
          <p className="text-muted-foreground">
            Based on your feedback, we've identified these key quality standards
          </p>
        </div>

        {/* Success message */}
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Analysis Complete!</h3>
                <p className="text-sm text-green-700 mt-1">
                  We've analyzed your {result.fewShotExamples.length} graded conversations and
                  identified {result.customCriteria.length} quality criteria that reflect your
                  standards. Review them below and make any adjustments you'd like.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Criteria cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Quality Criteria ({editingCriteria.length})</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Done Editing
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Criteria
                </>
              )}
            </Button>
          </div>

          {editingCriteria.map((criterion, idx) => (
            <Card key={criterion.id}>
              <CardHeader>
                {editMode ? (
                  <div className="space-y-2">
                    <Label>Criterion Name</Label>
                    <Input
                      value={criterion.name}
                      onChange={(e) => updateCriterion(idx, "name", e.target.value)}
                      placeholder="e.g., Pedagogical Soundness"
                    />
                  </div>
                ) : (
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {idx + 1}
                    </span>
                    {criterion.name}
                  </CardTitle>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={criterion.description}
                        onChange={(e) => updateCriterion(idx, "description", e.target.value)}
                        placeholder="Detailed description of what this criterion measures..."
                        className="min-h-[100px]"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeCriterion(idx)}
                    >
                      Remove Criterion
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm">{criterion.description}</p>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Derived From Your Feedback:
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        {criterion.derivedFrom}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          {editMode && (
            <Button variant="outline" onClick={addCriterion} className="w-full">
              + Add Another Criterion
            </Button>
          )}
        </div>

        {/* Few-shot examples section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Training Examples</CardTitle>
                <CardDescription>
                  {result.fewShotExamples.length} conversations will be used as examples when
                  evaluating new conversations
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExamples(!showExamples)}
              >
                {showExamples ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Hide Examples
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show Examples
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showExamples && (
            <CardContent className="space-y-3">
              {result.fewShotExamples.map((example, idx) => (
                <div
                  key={example.id}
                  className={`p-4 rounded-lg border-2 ${
                    example.userGrade.pass
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">
                      Example {idx + 1}: {example.persona.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        example.userGrade.pass
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {example.userGrade.pass ? "PASS" : "FAIL"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    "{example.userGrade.reasoning}"
                  </p>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Action buttons */}
        <Card className="border-2 border-primary">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Ready to Continue?</h3>
                <p className="text-sm text-muted-foreground">
                  These criteria will be used to automatically evaluate conversations at scale.
                  You can always refine them later if needed.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/projects/${projectId}/calibration/grade`)}
                >
                  Back to Grading
                </Button>
                <Button onClick={handleApprove} disabled={saving} className="flex-1">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Approve & Generate Test Cases
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
