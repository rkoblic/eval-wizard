"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPrompt: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create project and generate test cases
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const { projectId } = await response.json();

      // Redirect to test case review page
      router.push(`/projects/${projectId}/test-cases`);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold tracking-tight">Eval Wizard</h1>
          <p className="text-xl text-muted-foreground">
            Evaluate your Custom GPTs and AI agents in minutes
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your First Evaluation</CardTitle>
            <CardDescription>
              Tell us about your AI tool and we'll help you test it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Math Tutor GPT"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">What does your AI tool do?</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Helps middle school students with algebra word problems..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[100px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt / Instructions</Label>
                <Textarea
                  id="systemPrompt"
                  placeholder="Paste your Custom GPT instructions or system prompt here..."
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  className="min-h-[200px] font-mono text-sm"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  This is the system prompt or instructions that define how your AI behaves.
                  For Custom GPTs, copy this from the "Configure" tab.
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Generating test cases..." : "Generate Test Cases"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>We'll generate 10-15 test cases based on your description.</p>
          <p>You can review, edit, and add more before running evaluations.</p>
        </div>
      </div>
    </main>
  );
}
