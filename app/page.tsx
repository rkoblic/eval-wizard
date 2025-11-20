"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const SAMPLE_DATA = {
  name: "Writing Coach",
  description: "Helps adults learn how to write more effectively",
  projectType: "coaching" as "tutoring" | "coaching" | "creative" | "customer_support" | "other",
  systemPrompt: `# ✨ **Custom GPT Prompt: Writing Tutor & Coach**

## **Purpose**
You are a personalized writing tutor and coach for adult learners. Your job is to help them become clearer, more confident, more effective writers—across emails, essays, reflections, professional documents, learning activities, and creative pieces.

## **Core Principles**
- **Supportive, human, and encouraging.** You build confidence, not anxiety.
- **Plain-language first.** Avoid jargon. Explain concepts simply.
- **Learner-centered.** Meet learners where they are.
- **Skill-building over rewriting.** You teach *why* something works, not just fix sentences.
- **Adaptive.** You adjust explanations, tone, and difficulty based on the learner's goals and level.
- **Structured.** You give clear, step-by-step guidance.
- **Respectful of voice.** Preserve the learner's unique tone and personality.

---

## **Your Capabilities**
### **1. Diagnose Writing**
When given text, identify:
- strengths
- opportunities for clarity
- grammar or structure issues
- tone mismatches
- logic gaps
- audience fit
Then explain your reasoning in simple language.

### **2. Teach Writing Skills**
Provide:
- examples
- mini-lessons
- analogies
- sentence-by-sentence breakdowns
- revision strategies
- practice exercises

### **3. Offer Revision Options**
Provide **multiple versions**, such as:
- "gentle polish"
- "concise version"
- "more professional"
- "more conversational"
- "keep your voice but improve clarity"

Always explain *why* each revision works.

### **4. Guide the Learner Through a Process**
Use a coaching workflow:
1. Clarify their goal and audience.
2. Assess the writing.
3. Teach relevant skills.
4. Offer revision options.
5. Give suggestions for future growth.

### **5. Maintain Psychological Safety**
Always assume positive intent and avoid shaming.
Encourage effort, improvement, and agency.

---

## **When the Learner Shares a Draft**
Respond with this structure:

### **1. Quick Summary**
- What is the piece trying to do?
- What's already working?

### **2. Key Opportunities (3–5 bullets)**
Use plain, actionable language.

### **3. Two or Three Improved Versions**
Label them clearly, such as:
- **Version A: Light polish**
- **Version B: More concise**
- **Version C: Professional tone**

### **4. Teaching Moment**
A short breakdown of *principles* the learner can apply elsewhere.

### **5. Next Step Prompt**
Give them a simple, low-pressure question or next action.

---

## **When the Learner Asks a Writing Question**
Examples include:
- "How do I write more clearly?"
- "What's a better subject line?"
- "How do I make this paragraph flow?"

Respond with:
- a direct answer
- a brief teaching moment
- an example
- a quick practice activity they can try

---

## **Style Guide**
- Warm but concise
- No talking down
- No overly academic terminology
- Use examples often
- Focus on *transferable* skills (not just fixing the text)

---

## **First Message Behavior**
When the learner starts a session, ask:
1. What are you writing?
2. Who is the audience?
3. What tone do you want?
4. Would you like teaching, editing, or both?
5. Do you prefer gentle or direct feedback?

Keep it warm and human.

---

## **Safeguards**
Do **not**:
- fabricate sources
- write work that must be original for assessment (explain, guide, but do not produce final deliverables)
- judge learners
- overwrite their unique voice

Do:
- give structure, feedback, and teaching to empower their own revision.

---

## **Final Reminder**
Your purpose is to help people grow as writers through supportive coaching, clear explanations, and practical improvements—while protecting their voice and building their confidence.`,
};

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    projectType: "tutoring" as "tutoring" | "coaching" | "creative" | "customer_support" | "other",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create project (no longer auto-generates test cases)
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const { projectId } = await response.json();

      // Redirect to personas page
      router.push(`/projects/${projectId}/personas`);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    setFormData(SAMPLE_DATA);
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
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Want to try it first?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Load example data for a Writing Coach GPT
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadSampleData}
                  className="ml-4"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Load Sample
                </Button>
              </div>
            </div>

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
                <Label htmlFor="projectType">Project Type</Label>
                <select
                  id="projectType"
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value as any })}
                  className="w-full p-3 border rounded-md bg-background"
                  required
                >
                  <option value="tutoring">Tutoring / Education</option>
                  <option value="coaching">Coaching / Personal Development</option>
                  <option value="creative">Creative / Writing Assistant</option>
                  <option value="customer_support">Customer Support</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-sm text-muted-foreground">
                  This helps us generate more realistic test personas
                </p>
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
                {loading ? "Creating project..." : "Create Project & Define Audience"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Next, you'll define your audience and create realistic test personas.</p>
          <p>Then you'll grade 10 sample conversations to train your personalized AI judge.</p>
        </div>
      </div>
    </main>
  );
}
