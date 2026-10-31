/**
 * NPC voice playback: cached Text-to-Speech audio from the API (`/api/tts/:hash`, auth required)
 * with a browser speechSynthesis fallback when no audio is available (offline / dev mode).
 */
import { api } from '../api/client';

const urlCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;
let generation = 0;

export type PlayOutcome = 'played' | 'blocked' | 'unavailable';

export interface PlayOptions {
  text: string;
  ttsHash: string | null;
  accent: 'en-US' | 'en-GB';
  /** Slightly slower synthetic speech for B1. */
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export function stopNpcAudio() {
  generation++;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

async function ttsUrl(hash: string): Promise<string> {
  const cached = urlCache.get(hash);
  if (cached) return cached;
  const blob = await api.blob(`/api/tts/${hash}`);
  const url = URL.createObjectURL(blob);
  urlCache.set(hash, url);
  return url;
}

function pickVoice(accent: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === accent && /natural|neural|google|online/i.test(v.name)) ??
    voices.find((v) => v.lang === accent) ??
    voices.find((v) => v.lang.replace('_', '-').startsWith(accent)) ??
    voices.find((v) => v.lang.startsWith('en'))
  );
}

function speakSynthetic(opts: PlayOptions, gen: number): Promise<PlayOutcome> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve('unavailable');
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(opts.text);
    u.lang = opts.accent;
    const v = pickVoice(opts.accent);
    if (v) u.voice = v;
    u.rate = opts.rate ?? 1;
    let started = false;
    u.onstart = () => {
      started = true;
      if (gen === generation) opts.onStart?.();
      resolve('played');
    };
    u.onend = () => {
      if (gen === generation) opts.onEnd?.();
    };
    u.onerror = (e) => {
      if (gen === generation) opts.onEnd?.();
      if (!started) resolve(e.error === 'not-allowed' ? 'blocked' : 'unavailable');
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    // Some browsers never fire onstart without a user gesture.
    setTimeout(() => {
      if (!started) resolve('blocked');
    }, 2500);
  });
}

/** Plays an NPC line. Resolves once playback started (or failed). */
export async function playNpcLine(opts: PlayOptions): Promise<PlayOutcome> {
  stopNpcAudio();
  const gen = generation;
  if (opts.ttsHash) {
    try {
      const url = await ttsUrl(opts.ttsHash);
      if (gen !== generation) return 'played';
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onended = () => gen === generation && opts.onEnd?.();
      audio.onpause = () => gen === generation && opts.onEnd?.();
      await audio.play();
      opts.onStart?.();
      return 'played';
    } catch (e) {
      if ((e as DOMException).name === 'NotAllowedError') return 'blocked';
      // Audio missing or failed to load → fall back to the browser voice.
    }
  }
  return speakSynthetic(opts, gen);
}

// Voices load asynchronously in Chrome; warm the list early.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
}
