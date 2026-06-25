import { ExerciseRecord, WorkoutSession } from '../types';

/** Epley 공식으로 추정 1RM 계산 */
export function est1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** 한 운동 기록에서의 최고치 집계 */
export interface ExerciseBest {
  maxWeight: number;
  max1RM: number;
  maxReps: number; // 무게가 실린(또는 맨몸) 완료 세트의 최대 반복
}

export function bestOf(record: ExerciseRecord): ExerciseBest {
  let maxWeight = 0;
  let max1RM = 0;
  let maxReps = 0;
  for (const s of record.sets) {
    if (!s.completed || s.type === 'warmup') continue; // 워밍업 제외
    if (s.weight > maxWeight) maxWeight = s.weight;
    const e = est1RM(s.weight, s.reps);
    if (e > max1RM) max1RM = e;
    if (s.reps > maxReps) maxReps = s.reps;
  }
  return { maxWeight, max1RM, maxReps };
}

export type PRType = 'weight' | 'e1rm' | 'reps';

export interface PR {
  exerciseId: string;
  exerciseName: string;
  type: PRType;
  value: number;
  unit: string;
}

/**
 * 새 세션이 기존 기록을 갱신했는지 운동별로 1개의 대표 PR을 감지한다.
 * - 무게가 실린 운동: 중량 PR 우선, 없으면 추정 1RM PR
 * - 맨몸(무게 0): 반복 PR
 * priorSessions 에는 이번 세션을 제외한 과거 세션을 넘긴다.
 */
export function detectPRs(
  session: WorkoutSession,
  priorSessions: WorkoutSession[]
): PR[] {
  // 운동별 과거 최고치
  const prior = new Map<string, ExerciseBest>();
  for (const s of priorSessions) {
    if (s.startedAt >= session.startedAt) continue;
    for (const rec of s.records) {
      const b = bestOf(rec);
      const cur = prior.get(rec.exerciseId);
      prior.set(rec.exerciseId, {
        maxWeight: Math.max(cur?.maxWeight ?? 0, b.maxWeight),
        max1RM: Math.max(cur?.max1RM ?? 0, b.max1RM),
        maxReps: Math.max(cur?.maxReps ?? 0, b.maxReps),
      });
    }
  }

  const prs: PR[] = [];
  for (const rec of session.records) {
    const b = bestOf(rec);
    const old = prior.get(rec.exerciseId) ?? { maxWeight: 0, max1RM: 0, maxReps: 0 };
    if (b.maxWeight > 0 && b.maxWeight > old.maxWeight) {
      prs.push({
        exerciseId: rec.exerciseId,
        exerciseName: rec.exerciseName,
        type: 'weight',
        value: b.maxWeight,
        unit: session.unit,
      });
    } else if (b.max1RM > 0 && b.max1RM > old.max1RM) {
      prs.push({
        exerciseId: rec.exerciseId,
        exerciseName: rec.exerciseName,
        type: 'e1rm',
        value: b.max1RM,
        unit: session.unit,
      });
    } else if (b.maxWeight === 0 && b.maxReps > 0 && b.maxReps > old.maxReps) {
      prs.push({
        exerciseId: rec.exerciseId,
        exerciseName: rec.exerciseName,
        type: 'reps',
        value: b.maxReps,
        unit: '회',
      });
    }
  }
  return prs;
}

export function prLabel(pr: PR): string {
  if (pr.type === 'weight') return `${pr.value}${pr.unit} 최고 중량`;
  if (pr.type === 'e1rm') return `추정 1RM ${pr.value}${pr.unit}`;
  return `${pr.value}${pr.unit} 최다 반복`;
}

/** 운동별 세션 시계열 포인트 (진행 그래프용) */
export interface ProgressPoint {
  ts: number;
  maxWeight: number;
  max1RM: number;
  volume: number; // Σ(완료세트 무게×횟수)
}

export function exerciseProgress(
  exerciseId: string,
  sessions: WorkoutSession[]
): ProgressPoint[] {
  const points: ProgressPoint[] = [];
  for (const s of sessions) {
    const rec = s.records.find((r) => r.exerciseId === exerciseId);
    if (!rec) continue;
    const b = bestOf(rec);
    const volume = rec.sets.reduce(
      (t, set) =>
        t + (set.completed && set.type !== 'warmup' ? set.weight * set.reps : 0),
      0
    );
    if (b.maxWeight === 0 && b.maxReps === 0) continue;
    points.push({ ts: s.startedAt, maxWeight: b.maxWeight, max1RM: b.max1RM, volume });
  }
  return points.sort((a, b) => a.ts - b.ts);
}
