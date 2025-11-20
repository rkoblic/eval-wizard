// Shared in-memory storage for all API routes
// In production, this should be replaced with a database

import { Project, TestCase, EvalRun, EvalResult, ConversationResult } from "./types";

// Storage Maps
export const projects = new Map<string, Project>();
export const testCases = new Map<string, TestCase[]>();
export const evalRuns = new Map<string, EvalRun>();
export const evalResults = new Map<string, EvalResult[]>();
export const conversationResults = new Map<string, ConversationResult[]>();

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
