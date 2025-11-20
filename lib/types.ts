// Core types for the eval system

export type ProductType = "custom_gpt" | "system_prompt";
export type ProjectType = "tutoring" | "coaching" | "creative" | "customer_support" | "other";

export interface Project {
  id: string;
  name: string;
  description: string;
  productType: ProductType;
  projectType?: ProjectType; // Category for better persona generation
  systemPrompt: string;
  createdAt: Date;
}

export interface ConversationTurn {
  role: "user";
  content: string;
  evaluateAfter?: boolean; // Marks this as a checkpoint for evaluation
}

export interface TestCase {
  id: string;
  projectId: string;
  // New conversation-based structure
  turns?: ConversationTurn[];
  // Legacy single-turn structure (for backward compatibility)
  input?: string;
  expectedBehavior?: string;
  source: "ai_generated" | "manual";
  createdAt: Date;
}

// Helper to normalize test cases to conversation format
export function normalizeTestCase(testCase: TestCase): {
  turns: ConversationTurn[];
  expectedBehavior?: string;
} {
  if (testCase.turns && testCase.turns.length > 0) {
    // Already in new format
    return {
      turns: testCase.turns,
      expectedBehavior: testCase.expectedBehavior,
    };
  }
  // Convert legacy format to conversation
  return {
    turns: [{ role: "user", content: testCase.input || "", evaluateAfter: true }],
    expectedBehavior: testCase.expectedBehavior,
  };
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

// New result type for conversation evaluations
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CheckpointEvaluation {
  afterTurnIndex: number; // Index of the turn after which this evaluation was done
  criterionId: string;
  pass: boolean;
  reasoning: string;
}

export interface ConversationResult {
  id: string;
  evalRunId: string;
  testCaseId: string;
  conversation: ConversationMessage[]; // The full conversation that occurred
  checkpointEvaluations: CheckpointEvaluation[]; // Evaluations at specific checkpoints
  finalEvaluation: Array<{ // Final holistic evaluation
    criterionId: string;
    pass: boolean;
    reasoning: string;
  }>;
  createdAt: Date;
}

// Persona and Calibration Types
export interface Persona {
  id: string;
  projectId: string;
  name: string; // e.g., "Struggling High School Student"
  demographics: {
    ageRange?: string; // e.g., "14-16"
    role?: string; // e.g., "High school student", "Marketing professional"
    experienceLevel?: string; // e.g., "Beginner", "Intermediate"
  };
  goals: string[]; // What they want to achieve
  challenges: string[]; // What they struggle with
  context: string; // Additional behavioral context
  createdAt: Date;
}

export interface HumanGradedConversation {
  id: string;
  projectId: string;
  persona: Persona;
  conversation: ConversationMessage[]; // The full conversation
  userGrade: {
    pass: boolean;
    reasoning: string; // Why did it pass or fail
  };
  createdAt: Date;
}

export interface CustomCriterion {
  id: string;
  name: string;
  description: string;
  derivedFrom: string; // Summary of the pattern in user feedback
}

export interface CalibrationResult {
  id: string;
  projectId: string;
  customCriteria: CustomCriterion[]; // Criteria derived from user feedback
  fewShotExamples: HumanGradedConversation[]; // The 10 graded conversations
  createdAt: Date;
  approvedByUser: boolean;
}

export interface CalibrationProgress {
  projectId: string;
  totalRequired: number; // Usually 10
  completed: number;
  grades: Array<{
    conversationId: string;
    pass: boolean;
    reasoning: string;
  }>;
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
  // Conversation-specific criteria
  {
    id: "contextual-memory",
    name: "Contextual Memory & Consistency",
    description: "Remembers information from earlier in the conversation, doesn't contradict itself, and builds on what was previously discussed",
    category: "education",
  },
  {
    id: "conversational-flow",
    name: "Natural Conversational Flow",
    description: "Feels like talking to a human with appropriate transitions, varied responses, and natural pacing rather than robotic or repetitive patterns",
    category: "education",
  },
  {
    id: "progressive-disclosure",
    name: "Progressive Disclosure & Pacing",
    description: "Reveals information appropriately over time, doesn't overwhelm with too much at once, and matches the rhythm of the conversation",
    category: "education",
  },
  {
    id: "handles-confusion",
    name: "Recovery from Confusion",
    description: "Gracefully handles misunderstandings, asks clarifying questions when needed, and adapts if the student seems lost or confused",
    category: "education",
  },
];
