import AsyncStorage from '@react-native-async-storage/async-storage';
import { FiveByFiveProgram } from '../data/fivexfive';
import {
  BodyEntry,
  DEFAULT_SETTINGS,
  Exercise,
  PlannedWorkout,
  Routine,
  Settings,
  WorkoutDraft,
  WorkoutSession,
} from '../types';

const KEYS = {
  routines: 'fa.routines.v1',
  sessions: 'fa.sessions.v1',
  settings: 'fa.settings.v1',
  customExercises: 'fa.customExercises.v1',
  draft: 'fa.draft.v1',
  seeded: 'fa.seeded.v1',
  body: 'fa.body.v1',
  fivexfive: 'fa.fivexfive.v1',
  plan: 'fa.plan.v1',
};

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function setJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 조용히 무시 (다음 변경 때 재시도됨)
  }
}

export const db = {
  loadRoutines: () => getJSON<Routine[]>(KEYS.routines, []),
  saveRoutines: (r: Routine[]) => setJSON(KEYS.routines, r),

  loadSessions: () => getJSON<WorkoutSession[]>(KEYS.sessions, []),
  saveSessions: (s: WorkoutSession[]) => setJSON(KEYS.sessions, s),

  loadSettings: () => getJSON<Settings>(KEYS.settings, DEFAULT_SETTINGS),
  saveSettings: (s: Settings) => setJSON(KEYS.settings, s),

  loadCustomExercises: () => getJSON<Exercise[]>(KEYS.customExercises, []),
  saveCustomExercises: (e: Exercise[]) => setJSON(KEYS.customExercises, e),

  loadDraft: () => getJSON<WorkoutDraft | null>(KEYS.draft, null),
  saveDraft: (d: WorkoutDraft | null) =>
    d === null ? AsyncStorage.removeItem(KEYS.draft) : setJSON(KEYS.draft, d),

  loadSeeded: () => getJSON<boolean>(KEYS.seeded, false),
  saveSeeded: (v: boolean) => setJSON(KEYS.seeded, v),

  loadBody: () => getJSON<BodyEntry[]>(KEYS.body, []),
  saveBody: (b: BodyEntry[]) => setJSON(KEYS.body, b),

  loadPlan: () => getJSON<PlannedWorkout[]>(KEYS.plan, []),
  savePlan: (p: PlannedWorkout[]) => setJSON(KEYS.plan, p),

  loadFivexFive: () => getJSON<FiveByFiveProgram | null>(KEYS.fivexfive, null),
  saveFivexFive: (p: FiveByFiveProgram | null) =>
    p === null ? AsyncStorage.removeItem(KEYS.fivexfive) : setJSON(KEYS.fivexfive, p),

  clearAll: () => AsyncStorage.multiRemove(Object.values(KEYS)),
};
