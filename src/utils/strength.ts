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

// ── RPE 기반 자동 증량 (autoregulation) ─────────────────────
// 지난 세션이 "성공"(모든 워킹 세트 완료 + 목표 횟수 달성)이고
// RPE가 8 이하(또는 미기록)면 다음에 +2.5kg(/+5lb) 권장.
// RPE 9~10이면 같은 무게 유지, 실패면 같은 무게 재도전.
export interface WeightRecommendation {
  weight: number; // 이번에 권장하는 무게
  lastWeight: number; // 지난 세션 무게
  delta: number; // 증량분 (0이면 유지)
  rpe?: number; // 지난 세션에 기록된 RPE(최대값)
  reason: 'success' | 'hardRpe' | 'retry';
}

export function recommendNextWeight(
  exerciseId: string,
  targetReps: number | undefined,
  sessions: WorkoutSession[], // 최신순 정렬 가정
  unit: string
): WeightRecommendation | null {
  for (const sess of sessions) {
    const rec = sess.records.find((r) => r.exerciseId === exerciseId);
    if (!rec || rec.bodyPart === '유산소') continue;
    const work = rec.sets.filter((s) => s.type !== 'warmup');
    const done = work.filter((s) => s.completed && !s.skipped && s.weight > 0);
    if (done.length === 0) continue; // 무게 기록이 있는 가장 최근 세션을 찾음
    const lastWeight = Math.max(...done.map((s) => s.weight));
    const success =
      work.every((s) => s.completed || s.skipped) &&
      done.every((s) => (targetReps ? s.reps >= targetReps : s.reps > 0));
    const rpes = done
      .map((s) => s.rpe)
      .filter((v): v is number => typeof v === 'number' && v > 0);
    const rpe = rpes.length > 0 ? Math.max(...rpes) : undefined;
    const inc = unit === 'lb' ? 5 : 2.5;
    if (success && (rpe === undefined || rpe <= 8)) {
      return {
        weight: Math.round((lastWeight + inc) * 100) / 100,
        lastWeight,
        delta: inc,
        rpe,
        reason: 'success',
      };
    }
    if (success) {
      return { weight: lastWeight, lastWeight, delta: 0, rpe, reason: 'hardRpe' };
    }
    return { weight: lastWeight, lastWeight, delta: 0, rpe, reason: 'retry' };
  }
  return null;
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
