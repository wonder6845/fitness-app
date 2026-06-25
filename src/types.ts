// 앱 전역 데이터 모델 정의
// 명세서 9장 데이터 모델과 1:1 대응됩니다.

export type Unit = 'kg' | 'lb';

export type BodyPart =
  | '가슴'
  | '등'
  | '하체'
  | '어깨'
  | '팔'
  | '복근'
  | '유산소'
  | '기타';

export type Equipment = '바벨' | '덤벨' | '머신' | '케이블' | '맨몸' | '기타';

/** 운동 종목 (기본 DB + 사용자 커스텀) */
export interface Exercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  brand?: string; // 기구 브랜드 (해머스트렝스 등). 머신 운동에만 사용
  isCustom: boolean;
}

/** 루틴에 포함된 운동 1개의 구성 (세트 수 / 운동 시간 / 휴식 시간) */
export interface RoutineExercise {
  exerciseId: string;
  name: string; // 표시용 비정규화 필드
  bodyPart: BodyPart;
  equipment: Equipment;
  totalSets: number;
  exerciseSec: number; // 1세트 운동 시간(초)
  restSec: number; // 세트 간 휴식 시간(초)
  targetReps?: number; // 목표 반복 횟수 (프로그램에서 가져온 경우 세트 입력에 미리 채워짐)
  supersetGroup?: string; // 같은 값을 가진 연속 운동끼리 슈퍼셋으로 묶임
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  createdAt: number;
  updatedAt: number;
}

/** 세트 유형: 일반(undefined) / 워밍업 / 드롭 */
export type SetType = 'warmup' | 'drop';

/** 세트 1개 기록 */
export interface SetRecord {
  setNo: number;
  weight: number; // 무게 (settings.unit 기준)
  reps: number; // 반복 횟수
  completed: boolean; // 완료 체크 여부
  skipped: boolean; // 건너뛴 세트 여부
  type?: SetType; // 워밍업/드롭 (없으면 일반 세트)
  rpe?: number; // 주관적 운동강도 0~10 (선택)
}

/** 한 운동에 대한 기록 (세트 묶음 + 메모) */
export interface ExerciseRecord {
  exerciseId: string;
  exerciseName: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  sets: SetRecord[];
  memo: string;
}

export type SessionStatus = 'done' | 'partial';

/** 완료된(또는 부분 완료된) 운동 세션 1건 */
export interface WorkoutSession {
  id: string;
  routineId: string | null; // 원본 루틴 (삭제되어도 기록 유지 → null 가능)
  routineName: string; // 스냅샷된 루틴 이름
  status: SessionStatus;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  unit: Unit;
  totalVolume: number; // Σ(완료세트 무게 × 횟수)
  records: ExerciseRecord[];
  memo: string;
}

/** 진행 중 운동 임시 저장본 (크래시/강제종료 복구용) */
export interface WorkoutDraft {
  routineId: string | null;
  routineName: string;
  exercises: RoutineExercise[]; // 단계 재구성을 위한 루틴 스냅샷
  records: ExerciseRecord[];
  stepIndex: number;
  startedAt: number;
  unit: Unit;
  readySec: number; // 이 운동에 적용된 준비 카운트다운 길이(단계 재구성용)
  savedAt: number;
}

/** 신체 기록 1건 (체중/치수 등 시계열) */
export interface BodyEntry {
  id: string;
  metric: string; // BODY_METRICS 의 key
  value: number;
  ts: number;
}

export interface Settings {
  unit: Unit;
  vibration: boolean; // 단계 전환 진동
  countdownBeep: boolean; // 휴식 종료 직전 카운트다운 피드백
  keepAwake: boolean; // 운동 중 화면 항상 켜짐
  readyCountdown: boolean; // 세트 시작 전 3·2·1·GO 카운트다운
  showRPE: boolean; // 세트별 RPE 입력칸 표시
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  vibration: true,
  countdownBeep: true,
  keepAwake: true,
  readyCountdown: true,
  showRPE: false,
};

/** 준비 카운트다운 길이(초) */
export const READY_SEC = 3;
