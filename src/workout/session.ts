import {
  ExerciseRecord,
  RoutineExercise,
  SessionStatus,
  WorkoutDraft,
  WorkoutSession,
} from '../types';
import { sessionVolume, uid } from '../utils/helpers';

/** 루틴 운동 목록으로부터 빈 기록(세트 골격)을 생성 */
export function makeInitialRecords(
  exercises: RoutineExercise[]
): ExerciseRecord[] {
  return exercises.map((ex) => ({
    exerciseId: ex.exerciseId,
    exerciseName: ex.name,
    bodyPart: ex.bodyPart,
    equipment: ex.equipment,
    sets: Array.from({ length: Math.max(1, ex.totalSets) }, (_, i) => ({
      setNo: i + 1,
      weight: ex.startWeight ?? 0, // 시작 중량(5×5 권장 중량 등)이 있으면 미리 채움
      reps: ex.targetReps ?? 0, // 프로그램 목표 횟수가 있으면 미리 채움
      completed: false,
      skipped: false,
    })),
    memo: '',
  }));
}

/** 모든 세트가 완료/건너뜀 처리되고 1개 이상 완료면 done, 아니면 partial */
export function computeStatus(records: ExerciseRecord[]): SessionStatus {
  const allHandled = records.every((r) =>
    r.sets.every((s) => s.completed || s.skipped)
  );
  const anyCompleted = records.some((r) => r.sets.some((s) => s.completed));
  return allHandled && anyCompleted ? 'done' : 'partial';
}

export function buildSession(params: {
  routineId: string | null;
  routineName: string;
  records: ExerciseRecord[];
  unit: WorkoutSession['unit'];
  startedAt: number;
  endedAt: number;
  status: SessionStatus;
  memo?: string;
  programId?: string;
  routine?: WorkoutSession['routine'];
}): WorkoutSession {
  const { startedAt, endedAt } = params;
  return {
    id: uid('sess'),
    routineId: params.routineId,
    routineName: params.routineName,
    status: params.status,
    startedAt,
    endedAt,
    durationSec: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
    unit: params.unit,
    totalVolume: sessionVolume(params.records),
    records: params.records,
    memo: params.memo ?? '',
    programId: params.programId,
    routine: params.routine,
  };
}

/** 임시 저장본을 세션 기록으로 변환 (홈 화면 '기록만 저장') */
export function draftToSession(
  draft: WorkoutDraft,
  endedAt: number
): WorkoutSession {
  return buildSession({
    routineId: draft.routineId,
    routineName: draft.routineName,
    records: draft.records,
    unit: draft.unit,
    startedAt: draft.startedAt,
    endedAt,
    status: computeStatus(draft.records),
  });
}
