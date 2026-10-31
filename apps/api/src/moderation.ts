/**
 * Basic content filter for an educational setting. Gemini safety settings are the second layer.
 * The list is intentionally short; schools can extend it via BLOCKED_TERMS (comma separated).
 */
const DEFAULT_TERMS = ['fuck', 'fucking', 'shit', 'bitch', 'cunt', 'nigger', 'faggot', 'dick', 'pussy', 'whore', 'slut', 'đụ', 'địt', 'lồn', 'cặc'];

let terms: string[] | null = null;
function blocked(): string[] {
  if (!terms) {
    const extra = (process.env.BLOCKED_TERMS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    terms = [...DEFAULT_TERMS, ...extra];
  }
  return terms;
}

export function isInappropriate(text: string): boolean {
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  return blocked().some((w) => t.includes(` ${w} `));
}
