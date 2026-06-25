import { Platform } from 'react-native';

// 웹 전용 비프음(Web Audio). 네이티브에서는 no-op(햅틱이 대체).
// 별도 음원 파일 없이 오실레이터로 톤을 생성한다.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  try {
    const g = globalThis as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = g.AudioContext || g.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, durationMs: number, volume: number, startOffset = 0) {
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === 'suspended') c.resume();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(c.destination);
    const t0 = c.currentTime + startOffset;
    const t1 = t0 + durationMs / 1000;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  } catch {
    // 무시
  }
}

/** 카운트다운 비프 (3·2·1) */
export function playBeep(freq = 880, durationMs = 110, volume = 0.18) {
  tone(freq, durationMs, volume);
}

/** 휴식 종료 차임 (두 음 상승) */
export function playRestEndChime() {
  tone(740, 130, 0.2, 0);
  tone(1175, 220, 0.22, 0.13);
}
