import { BodyPart, Equipment, RoutineExercise, Unit, WorkoutSession } from '../types';

// ─────────────────────────────────────────────────────────────
// 5×5 스트렝스 프로그램 모델 + 엔진
// 상태(다음 중량·A/B 순서)는 저장하지 않고, 완료된 세션 기록에서 "파생"한다.
// → 중복 처리/상태 꼬임이 없고, 누락 시 자동 보정이 자연스럽다.
// ─────────────────────────────────────────────────────────────

export type Routine5x5 = 'A' | 'B';
export type LiftKey = 'squat' | 'bench' | 'row' | 'ohp' | 'deadlift';

export interface Lift5x5 {
  key: LiftKey;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  sets: number;
  reps: number;
  isLower: boolean;
  alts: string[]; // 대체 운동 (기구 없음/부상 시)
}

export const LIFTS: Record<LiftKey, Lift5x5> = {
  squat: { key: 'squat', name: '스쿼트', bodyPart: '하체', equipment: '바벨', sets: 5, reps: 5, isLower: true, alts: ['레그 프레스', '맨몸 스쿼트'] },
  bench: { key: 'bench', name: '벤치프레스', bodyPart: '가슴', equipment: '바벨', sets: 5, reps: 5, isLower: false, alts: ['덤벨 벤치프레스', '체스트 프레스 머신', '푸시업'] },
  row: { key: 'row', name: '바벨 로우', bodyPart: '등', equipment: '바벨', sets: 5, reps: 5, isLower: false, alts: ['덤벨 로우', '시티드 케이블 로우'] },
  ohp: { key: 'ohp', name: '오버헤드 프레스', bodyPart: '어깨', equipment: '바벨', sets: 5, reps: 5, isLower: false, alts: ['덤벨 숄더 프레스', '숄더 프레스 머신'] },
  deadlift: { key: 'deadlift', name: '데드리프트', bodyPart: '등', equipment: '바벨', sets: 1, reps: 5, isLower: true, alts: ['루마니안 데드리프트'] },
};

export const WORKOUT_A: LiftKey[] = ['squat', 'bench', 'row'];
export const WORKOUT_B: LiftKey[] = ['squat', 'ohp', 'deadlift'];

export function routineLifts(r: Routine5x5): LiftKey[] {
  return r === 'A' ? WORKOUT_A : WORKOUT_B;
}
export function otherRoutine(r: Routine5x5): Routine5x5 {
  return r === 'A' ? 'B' : 'A';
}
export function routineLabel(r: Routine5x5): string {
  return r === 'A' ? 'Workout A' : 'Workout B';
}
/** WorkoutSession.routine('5x5-A'/'5x5-B') ↔ Routine5x5('A'/'B') */
export function sessionRoutineTag(r: Routine5x5): '5x5-A' | '5x5-B' {
  return r === 'A' ? '5x5-A' : '5x5-B';
}
function tagToRoutine(tag?: string): Routine5x5 | null {
  if (tag === '5x5-A') return 'A';
  if (tag === '5x5-B') return 'B';
  return null;
}

export interface FiveByFiveProgram {
  id: string;
  name: string;
  unit: Unit;
  startDate: string; // 'YYYY-MM-DD'
  days: number[]; // 0=일 .. 6=토
  restSec: number;
  startRoutine: Routine5x5;
  startWeights: Record<LiftKey, number>;
  increments: Record<LiftKey, number>;
  skips: string[]; // 건너뜀 처리한 날짜(YYYY-MM-DD)
  createdAt: number;
}

export const DEFAULT_START_WEIGHTS: Record<LiftKey, number> = {
  squat: 20, bench: 20, row: 30, ohp: 20, deadlift: 40,
};
export const DEFAULT_INCREMENTS: Record<LiftKey, number> = {
  squat: 2.5, bench: 2.5, row: 2.5, ohp: 2.5, deadlift: 5,
};

export function defaultProgram(unit: Unit): Omit<FiveByFiveProgram, 'id' | 'createdAt'> {
  const lbStart: Record<LiftKey, number> = { squat: 45, bench: 45, row: 65, ohp: 45, deadlift: 95 };
  const lbInc: Record<LiftKey, number> = { squat: 5, bench: 5, row: 5, ohp: 5, deadlift: 10 };
  return {
    name: '5×5 스트렝스',
    unit,
    startDate: todayYmd(),
    days: [1, 3, 5], // 월·수·금
    restSec: 180,
    startRoutine: 'A',
    startWeights: unit === 'lb' ? lbStart : { ...DEFAULT_START_WEIGHTS },
    increments: unit === 'lb' ? lbInc : { ...DEFAULT_INCREMENTS },
    skips: [],
  };
}

// ── 날짜 유틸 (로컬 기준) ──────────────────────────────────────
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function todayYmd(): string {
  return ymd(new Date());
}
export function addDaysYmd(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
const WD = ['일', '월', '화', '수', '목', '금', '토'];
export function weekdayKo(s: string): string {
  return WD[parseYmd(s).getDay()];
}
export function fmtDateKo(s: string): string {
  const d = parseYmd(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
}
export const WEEKDAY_OPTIONS = [
  { idx: 1, label: '월' }, { idx: 2, label: '화' }, { idx: 3, label: '수' },
  { idx: 4, label: '목' }, { idx: 5, label: '금' }, { idx: 6, label: '토' }, { idx: 0, label: '일' },
];

export function roundToStep(w: number, step = 2.5): number {
  return Math.round(w / step) * step;
}

// ── 파생 상태 ────────────────────────────────────────────────
export interface LiftState {
  weight: number; // 다음 권장 중량
  failStreak: number; // 연속 실패 횟수
  lastResult: 'success' | 'fail' | null;
  lastWeight: number | null; // 직전 세션에서 실제 사용한 중량
  deloadPending: boolean; // 다음 회차가 deload 적용된 상태인지
}
export interface ProgramState {
  lifts: Record<LiftKey, LiftState>;
  completedCount: number;
  nextRoutine: Routine5x5;
  lastSessionDate: string | null;
  recentFailures: { lift: LiftKey; date: string; weight: number }[];
}

function liftSuccess(session: WorkoutSession, L: Lift5x5): { success: boolean; used: number | null } {
  const rec = session.records.find((r) => r.exerciseName === L.name);
  if (!rec) return { success: false, used: null };
  const good = rec.sets.filter((s) => s.completed && !s.skipped && s.reps >= L.reps).length;
  const used = rec.sets.find((s) => s.completed)?.weight ?? rec.sets[0]?.weight ?? null;
  return { success: good >= L.sets, used };
}

/** 완료된 5×5 세션들로부터 현재 상태(다음 중량·A/B 순서)를 파생 */
export function computeProgramState(
  program: FiveByFiveProgram,
  sessions: WorkoutSession[]
): ProgramState {
  const lifts: Record<LiftKey, LiftState> = {} as Record<LiftKey, LiftState>;
  (Object.keys(LIFTS) as LiftKey[]).forEach((k) => {
    lifts[k] = {
      weight: program.startWeights[k] ?? DEFAULT_START_WEIGHTS[k],
      failStreak: 0,
      lastResult: null,
      lastWeight: null,
      deloadPending: false,
    };
  });

  const tagged = sessions
    .filter((s) => s.programId === program.id && tagToRoutine(s.routine))
    .sort((a, b) => a.startedAt - b.startedAt);

  const recentFailures: ProgramState['recentFailures'] = [];

  for (const s of tagged) {
    const r = tagToRoutine(s.routine)!;
    for (const key of routineLifts(r)) {
      const L = LIFTS[key];
      const st = lifts[key];
      const { success, used } = liftSuccess(s, L);
      st.lastWeight = used ?? st.weight;
      st.deloadPending = false;
      if (success) {
        st.weight = roundToStep(st.weight + (program.increments[key] ?? DEFAULT_INCREMENTS[key]));
        st.failStreak = 0;
        st.lastResult = 'success';
      } else {
        st.failStreak += 1;
        st.lastResult = 'fail';
        recentFailures.push({ lift: key, date: ymd(new Date(s.startedAt)), weight: st.lastWeight ?? st.weight });
        if (st.failStreak >= 3) {
          st.weight = roundToStep(Math.max(20, st.weight * 0.9));
          st.failStreak = 0;
          st.deloadPending = true;
        }
      }
    }
  }

  const completedCount = tagged.length;
  const nextRoutine: Routine5x5 =
    completedCount % 2 === 0 ? program.startRoutine : otherRoutine(program.startRoutine);

  return {
    lifts,
    completedCount,
    nextRoutine,
    lastSessionDate: tagged.length ? ymd(new Date(tagged[tagged.length - 1].startedAt)) : null,
    recentFailures: recentFailures.slice(-5).reverse(),
  };
}

/** 다음 권장 중량 안내 문구 */
export function recommendationText(key: LiftKey, st: LiftState, unit: string): string {
  const L = LIFTS[key];
  if (st.deloadPending) {
    return `${L.name}: 3회 연속 실패 → 10% 감량한 ${st.weight}${unit}로 재시작`;
  }
  if (st.lastResult === 'success' && st.lastWeight != null) {
    return `${L.name} ${st.lastWeight}${unit} 5×5 성공! 다음 권장 ${st.weight}${unit}`;
  }
  if (st.lastResult === 'fail') {
    return `${L.name}: 동일 중량 ${st.weight}${unit} 재도전 (${st.failStreak}회 실패)`;
  }
  return `${L.name}: ${st.weight}${unit}로 시작`;
}

// ── 오늘의 운동(루틴) 생성 ───────────────────────────────────
export function buildRoutineExercises(
  program: FiveByFiveProgram,
  routine: Routine5x5,
  state: ProgramState
): RoutineExercise[] {
  return routineLifts(routine).map((key) => {
    const L = LIFTS[key];
    return {
      exerciseId: `5x5-${key}`,
      name: L.name,
      bodyPart: L.bodyPart,
      equipment: L.equipment,
      totalSets: L.sets,
      exerciseSec: 30,
      restSec: program.restSec,
      targetReps: L.reps,
      startWeight: state.lifts[key].weight,
    };
  });
}

// ── 일정 생성 + 상태 ────────────────────────────────────────
export type ScheduleStatus = 'done' | 'today' | 'upcoming' | 'missed' | 'skipped';
export interface ScheduleItem {
  date: string;
  status: ScheduleStatus;
  routine: Routine5x5 | null; // 완료=실제, 예정=투영, 놓침=null
}

/** 선택 요일 기준으로 운동일 목록(과거 일부~미래 일부)을 만들고 상태를 매긴다 */
export function buildSchedule(
  program: FiveByFiveProgram,
  sessions: WorkoutSession[],
  state: ProgramState,
  opts: { pastDays?: number; futureDays?: number } = {}
): ScheduleItem[] {
  const today = todayYmd();
  const pastDays = opts.pastDays ?? 21;
  const futureDays = opts.futureDays ?? 28;
  const from = maxYmd(program.startDate, addDaysYmd(today, -pastDays));
  const to = addDaysYmd(today, futureDays);

  // 완료된 날짜 → 루틴
  const doneByDate = new Map<string, Routine5x5>();
  sessions
    .filter((s) => s.programId === program.id && tagToRoutine(s.routine))
    .forEach((s) => doneByDate.set(ymd(new Date(s.startedAt)), tagToRoutine(s.routine)!));

  const dates: string[] = [];
  let d = parseYmd(from);
  const end = parseYmd(to);
  for (let i = 0; i < 400 && d <= end; i++) {
    if (program.days.includes(d.getDay())) dates.push(ymd(d));
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  }

  let proj = state.nextRoutine; // 미완료(오늘/미래) 투영 시작점
  return dates.map((date) => {
    if (doneByDate.has(date)) {
      return { date, status: 'done' as ScheduleStatus, routine: doneByDate.get(date)! };
    }
    if (program.skips.includes(date)) {
      return { date, status: 'skipped' as ScheduleStatus, routine: null };
    }
    if (date < today) {
      return { date, status: 'missed' as ScheduleStatus, routine: null };
    }
    // 오늘 또는 미래(미완료) → 투영 루틴 배정 후 교대
    const routine = proj;
    proj = otherRoutine(proj);
    return { date, status: date === today ? 'today' : 'upcoming', routine };
  });
}

function maxYmd(a: string, b: string): string {
  return a >= b ? a : b;
}

/** 다음 추천 운동일(오늘 포함, 미완료/미건너뜀 중 가장 빠른 날) */
export function nextWorkoutDate(schedule: ScheduleItem[]): ScheduleItem | null {
  return schedule.find((it) => it.status === 'today' || it.status === 'upcoming') ?? null;
}

/** 회복일 안내 (연속 이틀 경고 / 오늘 완료 안내) */
export function recoveryNote(
  state: ProgramState,
  schedule: ScheduleItem[]
): string | null {
  const today = todayYmd();
  const yesterday = addDaysYmd(today, -1);
  const doneToday = schedule.some((it) => it.date === today && it.status === 'done');
  if (doneToday) {
    const next = schedule.find((it) => it.date > today && it.status === 'upcoming');
    return next
      ? `오늘 5×5 훈련을 완료했어요. 다음 추천 운동일은 ${fmtDateKo(next.date)}입니다.`
      : '오늘 5×5 훈련을 완료했어요. 충분히 회복하세요.';
  }
  if (state.lastSessionDate === yesterday) {
    return '어제 5×5 훈련을 했어요. 연속 이틀 운동보다 하루 회복을 권장합니다.';
  }
  return null;
}
