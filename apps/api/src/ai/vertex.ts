import { GoogleGenAI, HarmBlockThreshold, HarmCategory, Type, type Schema } from '@google/genai';
import { AiAssessmentOutputSchema, AiTurnOutputSchema } from '@ecs/shared';
import {
  buildAssessSystemPrompt,
  buildAssessUserPrompt,
  buildConverseSystemPrompt,
  buildConverseUserPrompt,
} from './prompts.js';
import type { AiProvider, AssessInput, ConverseInput, Usage } from './types.js';

const TURN_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    npcReply: { type: Type.STRING },
    objectivesEvidence: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { objectiveId: { type: Type.STRING }, quote: { type: Type.STRING } },
        required: ['objectiveId', 'quote'],
      },
    },
    needsClarification: { type: Type.BOOLEAN },
    offTopic: { type: Type.BOOLEAN },
    inappropriate: { type: Type.BOOLEAN },
  },
  required: ['npcReply', 'objectivesEvidence', 'needsClarification', 'offTopic', 'inappropriate'],
  propertyOrdering: ['objectivesEvidence', 'needsClarification', 'offTopic', 'inappropriate', 'npcReply'],
};

const CRITERION: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    comment: { type: Type.STRING },
    evidenceTurns: { type: Type.ARRAY, items: { type: Type.INTEGER } },
  },
  required: ['score', 'comment', 'evidenceTurns'],
};
const STRINGS: Schema = { type: Type.ARRAY, items: { type: Type.STRING } };

const ASSESS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    comprehension: CRITERION,
    grammar: CRITERION,
    vocabulary: CRITERION,
    strengths: STRINGS,
    improvements: STRINGS,
    grammarCorrections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          corrected: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ['original', 'corrected', 'explanation'],
      },
    },
    vocabularyToReview: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { term: { type: Type.STRING }, example: { type: Type.STRING } },
        required: ['term', 'example'],
      },
    },
    listeningTips: STRINGS,
    nextPractice: STRINGS,
  },
  required: [
    'comprehension',
    'grammar',
    'vocabulary',
    'strengths',
    'improvements',
    'grammarCorrections',
    'vocabularyToReview',
    'listeningTips',
    'nextPractice',
  ],
};

const SAFETY = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }));

/**
 * Gemini 2.5 and 3.x Flash models "think" by default. Thinking tokens count against maxOutputTokens,
 * which truncates the JSON reply, so cap it explicitly (0 = off for low-latency conversation).
 */
function thinking(model: string, budget: number) {
  const capped = model.startsWith('gemini-2.5') || /^gemini-3[\d.]*-flash/.test(model);
  return capped ? { thinkingConfig: { thinkingBudget: budget } } : {};
}

function cap<T extends unknown[]>(arr: T | undefined, n: number): T {
  return (Array.isArray(arr) ? arr.slice(0, n) : []) as T;
}

export class VertexAiProvider implements AiProvider {
  readonly name = 'vertex';
  private readonly client: GoogleGenAI;

  constructor(project: string, location: string) {
    this.client = new GoogleGenAI({ vertexai: true, project, location });
  }

  private usage(meta: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } | undefined): Usage {
    return {
      inputTokens: meta?.promptTokenCount ?? 0,
      outputTokens: (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0),
    };
  }

  async converse(input: ConverseInput) {
    const res = await this.client.models.generateContent({
      model: input.model,
      contents: [{ role: 'user', parts: [{ text: buildConverseUserPrompt(input) }] }],
      config: {
        systemInstruction: buildConverseSystemPrompt(input.mission, input.state),
        temperature: input.temperature,
        maxOutputTokens: input.maxOutputTokens,
        responseMimeType: 'application/json',
        responseSchema: TURN_SCHEMA,
        safetySettings: SAFETY,
        ...thinking(input.model, 0),
      },
    });
    const text = res.text;
    if (!text) throw new Error('Empty AI response (possibly blocked by safety filters)');
    const output = AiTurnOutputSchema.parse(JSON.parse(text));
    return { output, usage: this.usage(res.usageMetadata) };
  }

  async assess(input: AssessInput) {
    const res = await this.client.models.generateContent({
      model: input.model,
      contents: [{ role: 'user', parts: [{ text: buildAssessUserPrompt(input) }] }],
      config: {
        systemInstruction: buildAssessSystemPrompt(input.mission),
        temperature: 0.2,
        maxOutputTokens: Math.max(2048, input.maxOutputTokens),
        responseMimeType: 'application/json',
        responseSchema: ASSESS_SCHEMA,
        safetySettings: SAFETY,
        ...thinking(input.model, 1024),
      },
    });
    const text = res.text;
    if (!text) throw new Error('Empty AI assessment response');
    const raw = JSON.parse(text) as Record<string, unknown>;
    // Trim arrays to schema limits before strict validation.
    for (const [k, n] of [
      ['strengths', 6],
      ['improvements', 6],
      ['grammarCorrections', 8],
      ['vocabularyToReview', 10],
      ['listeningTips', 5],
      ['nextPractice', 5],
    ] as const) {
      raw[k] = cap(raw[k] as unknown[], n);
    }
    const output = AiAssessmentOutputSchema.parse(raw);
    return { output, usage: this.usage(res.usageMetadata) };
  }

  async ping(model: string) {
    const res = await this.client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: ready' }] }],
      config: { maxOutputTokens: 256, ...thinking(model, 0) },
    });
    return (res.text ?? '').trim();
  }
}
