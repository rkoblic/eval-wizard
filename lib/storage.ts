// Shared in-memory storage for all API routes
// In production, this should be replaced with a database

import {
  Project,
  TestCase,
  EvalRun,
  EvalResult,
  ConversationResult,
  Persona,
  HumanGradedConversation,
  CalibrationResult,
  CalibrationProgress
} from "./types";

// Storage Maps
export const projects = new Map<string, Project>();
export const testCases = new Map<string, TestCase[]>();
export const evalRuns = new Map<string, EvalRun>();
export const evalResults = new Map<string, EvalResult[]>();
export const conversationResults = new Map<string, ConversationResult[]>();

// New storage for personas and calibration
export const personas = new Map<string, Persona[]>(); // Key: projectId
export const humanGradedConversations = new Map<string, HumanGradedConversation[]>(); // Key: projectId
export const calibrationResults = new Map<string, CalibrationResult>(); // Key: projectId
export const calibrationProgress = new Map<string, CalibrationProgress>(); // Key: projectId

// Helper functions
export function getProject(projectId: string): Project | undefined {
  return projects.get(projectId);
}

export function saveProject(project: Project): void {
  projects.set(project.id, project);
}

export function getTestCases(projectId: string): TestCase[] {
  return testCases.get(projectId) || [];
}

export function saveTestCases(projectId: string, cases: TestCase[]): void {
  testCases.set(projectId, cases);
}

export function getEvalRun(evalRunId: string): EvalRun | undefined {
  return evalRuns.get(evalRunId);
}

export function saveEvalRun(evalRun: EvalRun): void {
  evalRuns.set(evalRun.id, evalRun);
}

export function getEvalResults(evalRunId: string): EvalResult[] {
  return evalResults.get(evalRunId) || [];
}

export function saveEvalResults(evalRunId: string, results: EvalResult[]): void {
  evalResults.set(evalRunId, results);
}

export function getConversationResults(evalRunId: string): ConversationResult[] {
  return conversationResults.get(evalRunId) || [];
}

export function saveConversationResults(evalRunId: string, results: ConversationResult[]): void {
  conversationResults.set(evalRunId, results);
}

// Persona helper functions
export function getPersonas(projectId: string): Persona[] {
  return personas.get(projectId) || [];
}

export function savePersonas(projectId: string, projectPersonas: Persona[]): void {
  personas.set(projectId, projectPersonas);
}

// Human graded conversation helper functions
export function getHumanGradedConversations(projectId: string): HumanGradedConversation[] {
  return humanGradedConversations.get(projectId) || [];
}

export function saveHumanGradedConversation(projectId: string, conversation: HumanGradedConversation): void {
  const existing = humanGradedConversations.get(projectId) || [];
  humanGradedConversations.set(projectId, [...existing, conversation]);
}

// Calibration progress helper functions
export function getCalibrationProgress(projectId: string): CalibrationProgress | undefined {
  return calibrationProgress.get(projectId);
}

export function saveCalibrationProgress(projectId: string, progress: CalibrationProgress): void {
  calibrationProgress.set(projectId, progress);
}

// Calibration result helper functions
export function getCalibrationResult(projectId: string): CalibrationResult | undefined {
  return calibrationResults.get(projectId);
}

export function saveCalibrationResult(projectId: string, result: CalibrationResult): void {
  calibrationResults.set(projectId, result);
}
