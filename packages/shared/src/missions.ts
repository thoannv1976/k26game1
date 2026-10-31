import { MissionContentSchema, type MissionContent } from './schemas.js';
import M01 from '../../../content/missions/M01.json';
import M02 from '../../../content/missions/M02.json';
import M03 from '../../../content/missions/M03.json';
import M04 from '../../../content/missions/M04.json';
import M05 from '../../../content/missions/M05.json';
import M06 from '../../../content/missions/M06.json';

/**
 * Built-in mission bank (v1.0). This is seed content: at runtime the API serves
 * missions from Firestore (tenants/{t}/missions), where they can be edited and must be approved.
 */
export const BUILTIN_MISSIONS: MissionContent[] = [M01, M02, M03, M04, M05, M06].map((m) =>
  MissionContentSchema.parse(m),
);

export function getBuiltinMission(id: string): MissionContent | undefined {
  return BUILTIN_MISSIONS.find((m) => m.id === id);
}
