import { currentStage, keywordEvidence, applyEvidence, type AiAssessmentOutput } from '@ecs/shared';
import type { AiProvider, AssessInput, ConverseInput } from './types.js';

/**
 * Offline provider for local development and automated tests ONLY.
 * It detects objectives with the mission's evidence keywords and answers with scripted lines.
 * The API refuses to start with this provider in production (see config.ts).
 */
export class FakeAiProvider implements AiProvider {
  readonly name = 'fake';
  /** Test hook: make the next N calls fail. */
  failNext = 0;
  /** Test hook: delay in ms. */
  delayMs = 0;

  private async maybeFail() {
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.failNext > 0) {
      this.failNext -= 1;
      throw new Error('Simulated AI outage');
    }
  }

  async converse(input: ConverseInput) {
    await this.maybeFail();
    const { mission, state, studentText } = input;
    const evidence = keywordEvidence(mission, state, studentText);
    const preview = applyEvidence(mission, state, studentText, evidence, 0);
    let npcReply: string;
    if (preview.state.allStagesDone) npcReply = mission.npc.closingLine;
    else if (preview.stageChanged) npcReply = currentStage(mission, preview.state).fallbackLine;
    else if (evidence.length > 0) npcReply = `Thank you. ${currentStage(mission, state).fallbackLine}`;
    else npcReply = `Sorry, could you say that again? ${currentStage(mission, state).fallbackLine}`;
    return {
      output: {
        npcReply,
        objectivesEvidence: evidence,
        needsClarification: evidence.length === 0,
        offTopic: false,
        inappropriate: false,
      },
      usage: { inputTokens: 1200, outputTokens: 60 },
    };
  }

  async assess(input: AssessInput) {
    await this.maybeFail();
    const studentTurns = input.transcript.filter((t) => t.speaker === 'student');
    const words = studentTurns.reduce((n, t) => n + t.text.split(/\s+/).filter(Boolean).length, 0);
    const ratio = Math.min(1, words / 120);
    const r = input.mission.rubric;
    const seqs = studentTurns.slice(0, 3).map((t) => t.seq);
    const output: AiAssessmentOutput = {
      comprehension: { score: Math.round(r.comprehension * (0.5 + ratio / 2)), comment: 'Offline estimate (no AI).', evidenceTurns: seqs },
      grammar: { score: Math.round(r.grammar * (0.5 + ratio / 3)), comment: 'Offline estimate (no AI).', evidenceTurns: seqs },
      vocabulary: { score: Math.round(r.vocabulary * (0.5 + ratio / 3)), comment: 'Offline estimate (no AI).', evidenceTurns: seqs },
      strengths: ['You completed the conversation steps.'],
      improvements: ['Use longer, more complete sentences.'],
      grammarCorrections: [],
      vocabularyToReview: input.mission.targetVocabulary.slice(0, 3).map((term) => ({ term, example: `Use "${term}" in a sentence.` })),
      listeningTips: ['Listen again to the NPC questions and repeat them aloud.'],
      nextPractice: ['Replay the mission at a faster pace.'],
    };
    return { output, usage: { inputTokens: 2500, outputTokens: 400 } };
  }

  async ping() {
    return 'ready (offline provider)';
  }
}
