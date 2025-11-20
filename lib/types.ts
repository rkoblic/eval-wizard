// Core types for the eval system

export type ProductType = "custom_gpt" | "system_prompt";

export interface Project {
  id: string;
  name: string;
  description: string;
  productType: ProductType;
  systemPrompt: string;
  createdAt: Date;
}

export interface TestCase {
  id: string;
  projectId: string;
  input: string;
  expectedBehavior?: string;
  source: "ai_generated" | "manual";
  createdAt: Date;
}

export interface EvalCriterion {
  id: string;
  name: string;
  description: string;
  category: "education" | "general";
}

export interface EvalRun {
  id: string;
  projectId: string;
  status: "pending" | "running" | "completed" | "failed";
  criteriaIds: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface EvalResult {
  id: string;
  evalRunId: string;
  testCaseId: string;
  criterionId: string;
  pass: boolean;
  reasoning: string;
  aiResponse: string;
  createdAt: Date;
}

// Predefined education-focused evaluation criteria
export const EDUCATION_CRITERIA: EvalCriterion[] = [
  {
    id: "pedagogically-sound",
    name: "Pedagogically Sound",
    description: "Doesn't give away answers inappropriately; encourages learning through guidance",
    category: "education",
  },
  {
    id: "age-appropriate",
    name: "Age-Appropriate",
    description: "Uses language and concepts suitable for the target age group",
    category: "education",
  },
  {
    id: "critical-thinking",
    name: "Encourages Critical Thinking",
    description: "Promotes analytical reasoning and problem-solving skills",
    category: "education",
  },
  {
    id: "inclusive",
    name: "Inclusive & Culturally Sensitive",
    description: "Accessible and respectful of diverse backgrounds and learning styles",
    category: "education",
  },
  {
    id: "handles-off-topic",
    name: "Handles Off-Topic Requests",
    description: "Appropriately redirects or declines inappropriate or off-topic queries",
    category: "education",
  },
  {
    id: "supportive",
    name: "Supportive When Student Struggles",
    description: "Provides helpful guidance and encouragement when student has difficulty",
    category: "education",
  },
  {
    id: "accurate",
    name: "Accurate Information",
    description: "Provides factually correct and up-to-date information",
    category: "education",
  },
];
