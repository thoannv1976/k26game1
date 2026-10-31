import { MissionContentSchema, type MissionContent } from '../src/schemas.js';

/** Small self-contained mission used by unit tests (independent of the content files). */
export const FIXTURE: MissionContent = MissionContentSchema.parse({
  id: 'M99',
  locationId: 'airport',
  level: 'B1',
  title: { en: 'Test', vi: 'Thử' },
  summary: { en: 'Test mission', vi: 'Nhiệm vụ thử' },
  briefing: { en: 'Briefing', vi: 'Bối cảnh' },
  goals: [
    { en: 'Goal 1', vi: 'Mục tiêu 1' },
    { en: 'Goal 2', vi: 'Mục tiêu 2' },
  ],
  estimatedMinutes: 10,
  xpReward: 100,
  studentCard: [{ label: 'Flight', value: 'VN 301' }],
  npc: {
    name: 'Anna',
    role: 'Agent',
    avatar: 'airport-agent',
    voice: { languageCode: 'en-GB', name: 'en-GB-Neural2-A' },
    personality: 'Friendly and patient.',
    openingLine: 'Hello, how can I help you?',
    closingLine: 'Have a nice day!',
  },
  npcFacts: ['The bag is in Bangkok.'],
  stages: [
    {
      id: 'problem',
      title: 'Problem',
      npcGoal: 'Ask what the problem is.',
      fallbackLine: 'What seems to be the problem?',
      objectives: [
        { id: 'explain', description: 'Explain the bag is missing', label: { en: 'Explain', vi: 'Trình bày' }, required: true, evidenceKeywords: ['missing', 'lost'] },
      ],
      hints: ['Say: My bag is missing.'],
      sampleStudentLines: ['My bag is missing.'],
    },
    {
      id: 'info',
      title: 'Info',
      npcGoal: 'Ask for the flight number and bag colour.',
      twist: 'The bag went to Bangkok.',
      fallbackLine: 'What is your flight number?',
      objectives: [
        { id: 'flight', description: 'Give flight VN 301', label: { en: 'Flight', vi: 'Chuyến bay' }, required: true, evidenceKeywords: ['vn 301', '301'] },
        { id: 'colour', description: 'Describe a blue bag', label: { en: 'Colour', vi: 'Màu' }, required: true, evidenceKeywords: ['blue'] },
        { id: 'thanks', description: 'Optional politeness', label: { en: 'Thanks', vi: 'Cảm ơn' }, required: false, evidenceKeywords: ['appreciate'] },
      ],
      hints: ['Give your flight number.'],
      sampleStudentLines: ['It was VN 301.', 'A blue suitcase.'],
    },
  ],
  targetVocabulary: ['baggage claim', 'tag', 'suitcase'],
  limits: { maxTurns: 10, maxMinutes: 10, maxReplays: 3, maxHints: 3, maxRecordSeconds: 30 },
});
