import type { AiAssessmentOutput, AiTurnOutput, Level, MissionContent, ScenarioState } from '@ecs/shared';

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface HistoryLine {
  speaker: 'npc' | 'student' | 'system';
  text: string;
}

export interface ConverseInput {
  mission: MissionContent;
  state: ScenarioState;
  level: Level;
  history: HistoryLine[];
  studentText: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

export interface AssessInput {
  mission: MissionContent;
  level: Level;
  transcript: { seq: number; speaker: 'npc' | 'student'; text: string; mode: string }[];
  objectivesSummary: string;
  model: string;
  maxOutputTokens: number;
}

export interface AiProvider {
  readonly name: string;
  converse(input: ConverseInput): Promise<{ output: AiTurnOutput; usage: Usage }>;
  assess(input: AssessInput): Promise<{ output: AiAssessmentOutput; usage: Usage }>;
  /** Small connectivity check used by the admin health endpoint. */
  ping(model: string): Promise<string>;
}
