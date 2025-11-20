"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { HumanGradedConversation, ConversationMessage } from "@/lib/types";

export default function CalibrationGradePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conversations, setConversations] = useState<HumanGradedConversation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [grades, setGrades] = useState<Array<{ pass: boolean; reasoning: string }>>([]);

  useEffect(() => {
    loadConversations();
  }, [projectId]);

  const loadConversations = async () => {
    try {
      // Try loading from session storage first
      const sessionData = sessionStorage.getItem(`calibration_conversations_${projectId}`);
      if (sessionData) {
        const parsedConversations = JSON.parse(sessionData);
        setConversations(parsedConversations);

        // Initialize grades array
        const initialGrades = parsedConversations.map((c: HumanGradedConversation) => ({
          pass: c.userGrade.pass || false,
          reasoning: c.userGrade.reasoning || "",
        }));
        setGrades(initialGrades);
      } else {
        // If not in session storage, conversations weren't generated yet
        router.push(`/projects/${projectId}/calibration/intro`);
        return;
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveGrade = async (pass: boolean, reasoning: string, advance: boolean = true) => {
    setSaving(true);

    try {
      // Update local state
      const newGrades = [...grades];
      newGrades[currentIndex] = { pass, reasoning };
      setGrades(newGrades);

      // Update conversation object
      const updatedConversations = [...conversations];
      updatedConversations[currentIndex].userGrade = { pass, reasoning };
      setConversations(updatedConversations);

      // Save to session storage
      sessionStorage.setItem(
        `calibration_conversations_${projectId}`,
        JSON.stringify(updatedConversations)
      );

      // Save to backend
      await fetch("/api/calibration/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          conversationId: conversations[currentIndex].id,
          pass,
          reasoning,
          completedIndex: currentIndex,
        }),
      });

      // Check if all conversations are graded
      const allGraded = newGrades.every((g) => g.reasoning.trim() !== "");

      if (allGraded) {
        // All conversations graded - navigate to analysis
        router.push(`/projects/${projectId}/calibration/analyze`);
      } else if (advance) {
        // Move to next ungraded conversation
        const nextIndex = findNextUngradedIndex(newGrades, currentIndex);
        setCurrentIndex(nextIndex);
      }
    } catch (error) {
      console.error("Error saving grade:", error);
      alert("Failed to save grade. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const findNextUngradedIndex = (gradesList: Array<{ pass: boolean; reasoning: string }>, current: number): number => {
    // First, try to find next ungraded after current
    for (let i = current + 1; i < gradesList.length; i++) {
      if (gradesList[i].reasoning.trim() === "") {
        return i;
      }
    }

    // Then try from beginning
    for (let i = 0; i < current; i++) {
      if (gradesList[i].reasoning.trim() === "") {
        return i;
      }
    }

    // All graded, stay at current or go to next if available
    return Math.min(current + 1, gradesList.length - 1);
  };

  const handleQuickGrade = (pass: boolean) => {
    const currentGrade = grades[currentIndex];
    if (currentGrade.reasoning.trim() !== "") {
      saveGrade(pass, currentGrade.reasoning);
    }
  };

  const navigateTo = (index: number) => {
    if (index >= 0 && index < conversations.length) {
      setCurrentIndex(index);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Conversations Found</CardTitle>
            <CardDescription>
              Unable to load training conversations. Please try generating them again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/projects/${projectId}/calibration/intro`)}>
              Back to Calibration Intro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentConversation = conversations[currentIndex];
  const currentGrade = grades[currentIndex];
  const completedCount = grades.filter((g) => g.reasoning.trim() !== "").length;

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-background to-muted">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header with progress */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Grade Training Conversations</h1>
            <p className="text-muted-foreground mt-1">
              Help us understand your quality standards
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {completedCount} / {conversations.length}
            </div>
            <p className="text-sm text-muted-foreground">Conversations Graded</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / conversations.length) * 100}%` }}
          />
        </div>

        {/* Conversation selector */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateTo(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 flex gap-2 overflow-x-auto py-2">
            {conversations.map((_, idx) => (
              <button
                key={idx}
                onClick={() => navigateTo(idx)}
                className={`
                  min-w-12 h-12 rounded-lg flex items-center justify-center text-sm font-medium
                  transition-all
                  ${idx === currentIndex
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                    : grades[idx].reasoning.trim() !== ""
                    ? "bg-green-100 text-green-700 border-2 border-green-200"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }
                `}
              >
                {grades[idx].reasoning.trim() !== "" && (
                  <CheckCircle className="h-4 w-4 absolute -top-1 -right-1" />
                )}
                {idx + 1}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateTo(currentIndex + 1)}
            disabled={currentIndex === conversations.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Main conversation card */}
        <Card>
          <CardHeader>
            <CardTitle>Conversation {currentIndex + 1}</CardTitle>
            <CardDescription>
              Persona: {currentConversation.persona.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Persona context */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">About This User</h3>
              <p className="text-sm text-muted-foreground">
                {currentConversation.persona.context}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                <div>
                  <span className="font-medium">Goals:</span>
                  <ul className="list-disc list-inside text-muted-foreground mt-1">
                    {currentConversation.persona.goals.map((goal, idx) => (
                      <li key={idx}>{goal}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-medium">Challenges:</span>
                  <ul className="list-disc list-inside text-muted-foreground mt-1">
                    {currentConversation.persona.challenges.map((challenge, idx) => (
                      <li key={idx}>{challenge}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Conversation thread */}
            <div className="space-y-4">
              <h3 className="font-semibold">Conversation</h3>
              <div className="space-y-3">
                {currentConversation.conversation.map((message: ConversationMessage, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      message.role === "user"
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-green-50 border border-green-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase">
                        {message.role === "user" ? "User" : "AI Assistant"}
                      </span>
                      {message.evaluateAfter && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">
                          Evaluation Point
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Grading section */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="font-semibold">Your Evaluation</h3>

              {/* Pass/Fail buttons */}
              <div className="flex gap-4">
                <Button
                  variant={currentGrade.pass === true ? "default" : "outline"}
                  className={currentGrade.pass === true ? "bg-green-600 hover:bg-green-700" : ""}
                  onClick={() => {
                    const newGrades = [...grades];
                    newGrades[currentIndex] = { ...currentGrade, pass: true };
                    setGrades(newGrades);
                  }}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Pass
                </Button>
                <Button
                  variant={currentGrade.pass === false && currentGrade.reasoning !== "" ? "default" : "outline"}
                  className={currentGrade.pass === false && currentGrade.reasoning !== "" ? "bg-red-600 hover:bg-red-700" : ""}
                  onClick={() => {
                    const newGrades = [...grades];
                    newGrades[currentIndex] = { ...currentGrade, pass: false };
                    setGrades(newGrades);
                  }}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Fail
                </Button>
              </div>

              {/* Reasoning textarea */}
              <div className="space-y-2">
                <Label htmlFor="reasoning">
                  Why did you give this grade? (Required)
                </Label>
                <Textarea
                  id="reasoning"
                  placeholder="Explain what the AI did well or what it could improve. Be specific - this helps train your personalized judge."
                  value={currentGrade.reasoning}
                  onChange={(e) => {
                    const newGrades = [...grades];
                    newGrades[currentIndex] = { ...currentGrade, reasoning: e.target.value };
                    setGrades(newGrades);
                  }}
                  className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  Your reasoning is used to understand your quality standards. The more specific you are,
                  the better the AI judge will match your expectations.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => saveGrade(currentGrade.pass, currentGrade.reasoning, false)}
                  disabled={saving || currentGrade.reasoning.trim() === ""}
                  variant="outline"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save & Stay"
                  )}
                </Button>
                <Button
                  onClick={() => saveGrade(currentGrade.pass, currentGrade.reasoning, true)}
                  disabled={saving || currentGrade.reasoning.trim() === ""}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : completedCount === conversations.length - 1 && currentGrade.reasoning.trim() !== "" ? (
                    "Complete Calibration"
                  ) : (
                    "Save & Continue"
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
