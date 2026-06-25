import { ExerciseRecord } from '../types';

let _counter = 0;

/** 충돌 가능성이 매우 낮은 로컬 고유 id 생성 */
export function uid(prefix = 'id'): string {
  _counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${_counter.toString(36)}_${Math.floor(
    Math.random() * 1e6
  ).toString(36)}`;
}

/** 타임스탬프 → 로컬 'YYYY-MM-DD' (달력 키) */
export function dateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function fmtDateKorean(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ap = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ap} ${h12}:${mm}`;
}

/** 초 → 'MM:SS' (타이머 표시) */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** 초 → '1시간 5분' / '23분' (소요 시간 요약) */
export function fmtDuration(sec: number): string {
  const m = Math.max(0, Math.round(sec / 60));
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}시간` : `${h}시간 ${rem}분`;
}

/** 세션 총 볼륨 = Σ(완료 세트의 무게 × 횟수) — 워밍업 세트는 제외 */
export function sessionVolume(records: ExerciseRecord[]): number {
  return records.reduce(
    (total, r) =>
      total +
      r.sets.reduce(
        (s, set) =>
          s + (set.completed && set.type !== 'warmup' ? set.weight * set.reps : 0),
        0
      ),
    0
  );
}

export function completedSetCount(records: ExerciseRecord[]): number {
  return records.reduce(
    (n, r) => n + r.sets.filter((s) => s.completed).length,
    0
  );
}

export function totalSetCount(records: ExerciseRecord[]): number {
  return records.reduce((n, r) => n + r.sets.length, 0);
}

/** 이름 정규화 (중복 검사용): 공백 제거 + 소문자 */
export function normalizeName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

/** 숫자 입력 파싱 (빈값/NaN → 0, 음수 방지) */
export function parseNum(text: string): number {
  const n = parseFloat(text.replace(/[^0-9.]/g, ''));
  if (isNaN(n) || n < 0) return 0;
  return n;
}
