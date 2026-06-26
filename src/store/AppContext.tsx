import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BASE_EXERCISES } from '../data/exercises';
import { FiveByFiveProgram } from '../data/fivexfive';
import { WorkoutProgram } from '../data/programs';
import { db } from '../storage/db';
import {
  BodyEntry,
  DEFAULT_SETTINGS,
  Exercise,
  Routine,
  RoutineExercise,
  Settings,
  WorkoutDraft,
  WorkoutSession,
} from '../types';
import { normalizeName, uid } from '../utils/helpers';

interface AppState {
  loading: boolean;
  routines: Routine[];
  sessions: WorkoutSession[];
  customExercises: Exercise[];
  settings: Settings;
  draft: WorkoutDraft | null;

  // 파생값
  allExercises: Exercise[];

  // 루틴
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  getRoutine: (id: string) => Routine | undefined;
  addProgramRoutine: (program: WorkoutProgram) => Routine;

  // 세션
  addSession: (s: WorkoutSession) => void;
  updateSession: (s: WorkoutSession) => void;
  deleteSession: (id: string) => void;

  // 커스텀 운동
  addCustomExercise: (
    e: Omit<Exercise, 'id' | 'isCustom'>
  ) => { ok: true; exercise: Exercise } | { ok: false; reason: string };
  deleteCustomExercise: (id: string) => void;

  // 신체 기록
  bodyLog: BodyEntry[];
  addBodyEntry: (metric: string, value: number, ts?: number) => void;
  deleteBodyEntry: (id: string) => void;

  // 5×5 프로그램
  fivexfive: FiveByFiveProgram | null;
  saveFivexFive: (p: FiveByFiveProgram) => void;
  clearFivexFive: () => void;

  // 설정
  updateSettings: (patch: Partial<Settings>) => void;

  // 진행 중 운동 임시 저장
  saveDraft: (d: WorkoutDraft) => void;
  clearDraft: () => void;

  // 루틴 편집 버퍼 (RoutineEdit ↔ ExercisePicker 공유)
  draftRoutine: Routine | null;
  beginEditRoutine: (routine: Routine) => void;
  updateDraftRoutine: (patch: Partial<Routine>) => void;
  setDraftExercises: (exercises: RoutineExercise[]) => void;
  addExercisesToDraft: (exs: Exercise[]) => void;
  endEditRoutine: () => void;

  // 개발용
  resetAll: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [draftRoutine, setDraftRoutine] = useState<Routine | null>(null);
  const [bodyLog, setBodyLog] = useState<BodyEntry[]>([]);
  const [fivexfive, setFivexFive] = useState<FiveByFiveProgram | null>(null);

  // 최초 로드
  useEffect(() => {
    (async () => {
      const [r, s, c, st, d, seeded, body, ff] = await Promise.all([
        db.loadRoutines(),
        db.loadSessions(),
        db.loadCustomExercises(),
        db.loadSettings(),
        db.loadDraft(),
        db.loadSeeded(),
        db.loadBody(),
        db.loadFivexFive(),
      ]);
      setBodyLog(body);
      setFivexFive(ff);
      // 첫 실행 시 예시 루틴 1개 시드 (한 번만)
      let routinesToUse = r;
      if (r.length === 0 && !seeded) {
        routinesToUse = [makeSampleRoutine()];
        db.saveRoutines(routinesToUse);
        db.saveSeeded(true);
      } else if (!seeded) {
        db.saveSeeded(true);
      }
      setRoutines(routinesToUse);
      setSessions(s);
      setCustomExercises(c);
      setSettings({ ...DEFAULT_SETTINGS, ...st });
      setDraft(d);
      setLoading(false);
    })();
  }, []);

  const allExercises = useMemo(
    () => [...customExercises, ...BASE_EXERCISES],
    [customExercises]
  );

  const saveRoutine = useCallback((r: Routine) => {
    setRoutines((prev) => {
      const exists = prev.some((x) => x.id === r.id);
      const next = exists
        ? prev.map((x) => (x.id === r.id ? r : x))
        : [r, ...prev];
      db.saveRoutines(next);
      return next;
    });
  }, []);

  const deleteRoutine = useCallback((id: string) => {
    setRoutines((prev) => {
      const next = prev.filter((x) => x.id !== id);
      db.saveRoutines(next);
      return next;
    });
  }, []);

  const getRoutine = useCallback(
    (id: string) => routines.find((r) => r.id === id),
    [routines]
  );

  const addProgramRoutine = useCallback(
    (program: WorkoutProgram): Routine => {
      const now = Date.now();
      const exercises: RoutineExercise[] = program.exercises.map((pe) => {
        // 이름·부위·기구가 모두 같은 기존 운동이 있으면 그 id를 재사용해
        // 이전 기록(이전 무게/횟수)이 연결되도록 한다.
        const match = allExercises.find(
          (e) =>
            normalizeName(e.name) === normalizeName(pe.name) &&
            e.bodyPart === pe.bodyPart &&
            e.equipment === pe.equipment
        );
        return {
          exerciseId: match
            ? match.id
            : `prog_${program.id}_${normalizeName(pe.name)}`,
          name: pe.name,
          bodyPart: pe.bodyPart,
          equipment: pe.equipment,
          totalSets: pe.totalSets,
          exerciseSec: pe.exerciseSec,
          restSec: pe.restSec,
          targetReps: pe.targetReps,
        };
      });
      const routine: Routine = {
        id: uid('rt'),
        name: program.name,
        exercises,
        createdAt: now,
        updatedAt: now,
      };
      setRoutines((prev) => {
        const next = [routine, ...prev];
        db.saveRoutines(next);
        return next;
      });
      return routine;
    },
    [allExercises]
  );

  const addSession = useCallback((s: WorkoutSession) => {
    setSessions((prev) => {
      const next = [s, ...prev].sort((a, b) => b.startedAt - a.startedAt);
      db.saveSessions(next);
      return next;
    });
  }, []);

  const updateSession = useCallback((s: WorkoutSession) => {
    setSessions((prev) => {
      const next = prev.map((x) => (x.id === s.id ? s : x));
      db.saveSessions(next);
      return next;
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((x) => x.id !== id);
      db.saveSessions(next);
      return next;
    });
  }, []);

  const addCustomExercise = useCallback(
    (e: Omit<Exercise, 'id' | 'isCustom'>) => {
      const norm = normalizeName(e.name);
      if (!norm) return { ok: false as const, reason: '운동 이름을 입력해주세요.' };

      // 기본 운동과 중복
      const base = BASE_EXERCISES.find((b) => normalizeName(b.name) === norm);
      if (base) {
        return {
          ok: false as const,
          reason: `'${base.name}'은(는) 이미 기본 운동에 있어요. 기존 운동을 사용해주세요.`,
        };
      }
      // 커스텀 운동과 중복 (같은 이름 + 같은 부위 + 같은 기구면 차단)
      const dupCustom = customExercises.find(
        (c) =>
          normalizeName(c.name) === norm &&
          c.bodyPart === e.bodyPart &&
          c.equipment === e.equipment
      );
      if (dupCustom) {
        return {
          ok: false as const,
          reason: '동일한 이름·부위·기구의 커스텀 운동이 이미 있어요.',
        };
      }

      const exercise: Exercise = { ...e, id: uid('cust'), isCustom: true };
      setCustomExercises((prev) => {
        const next = [exercise, ...prev];
        db.saveCustomExercises(next);
        return next;
      });
      return { ok: true as const, exercise };
    },
    [customExercises]
  );

  const deleteCustomExercise = useCallback((id: string) => {
    setCustomExercises((prev) => {
      const next = prev.filter((x) => x.id !== id);
      db.saveCustomExercises(next);
      return next;
    });
  }, []);

  const addBodyEntry = useCallback(
    (metric: string, value: number, ts?: number) => {
      const entry: BodyEntry = {
        id: uid('body'),
        metric,
        value,
        ts: ts ?? Date.now(),
      };
      setBodyLog((prev) => {
        const next = [...prev, entry].sort((a, b) => a.ts - b.ts);
        db.saveBody(next);
        return next;
      });
    },
    []
  );

  const deleteBodyEntry = useCallback((id: string) => {
    setBodyLog((prev) => {
      const next = prev.filter((e) => e.id !== id);
      db.saveBody(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      db.saveSettings(next);
      return next;
    });
  }, []);

  const saveDraft = useCallback((d: WorkoutDraft) => {
    setDraft(d);
    db.saveDraft(d);
  }, []);

  const clearDraft = useCallback(() => {
    setDraft(null);
    db.saveDraft(null);
  }, []);

  const beginEditRoutine = useCallback((routine: Routine) => {
    setDraftRoutine(routine);
  }, []);

  const updateDraftRoutine = useCallback((patch: Partial<Routine>) => {
    setDraftRoutine((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const setDraftExercises = useCallback((exercises: RoutineExercise[]) => {
    setDraftRoutine((prev) => (prev ? { ...prev, exercises } : prev));
  }, []);

  const addExercisesToDraft = useCallback((exs: Exercise[]) => {
    setDraftRoutine((prev) => {
      if (!prev) return prev;
      const additions = exs.map(makeRoutineExercise);
      return { ...prev, exercises: [...prev.exercises, ...additions] };
    });
  }, []);

  const endEditRoutine = useCallback(() => setDraftRoutine(null), []);

  const saveFivexFive = useCallback((p: FiveByFiveProgram) => {
    setFivexFive(p);
    db.saveFivexFive(p);
  }, []);
  const clearFivexFive = useCallback(() => {
    setFivexFive(null);
    db.saveFivexFive(null);
  }, []);

  const resetAll = useCallback(() => {
    db.clearAll();
    setRoutines([]);
    setSessions([]);
    setCustomExercises([]);
    setSettings(DEFAULT_SETTINGS);
    setDraft(null);
    setBodyLog([]);
    setFivexFive(null);
  }, []);

  const value: AppState = {
    loading,
    routines,
    sessions,
    customExercises,
    settings,
    draft,
    allExercises,
    saveRoutine,
    deleteRoutine,
    getRoutine,
    addProgramRoutine,
    addSession,
    updateSession,
    deleteSession,
    addCustomExercise,
    deleteCustomExercise,
    bodyLog,
    addBodyEntry,
    deleteBodyEntry,
    fivexfive,
    saveFivexFive,
    clearFivexFive,
    updateSettings,
    saveDraft,
    clearDraft,
    draftRoutine,
    beginEditRoutine,
    updateDraftRoutine,
    setDraftExercises,
    addExercisesToDraft,
    endEditRoutine,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

/** 첫 실행용 예시 루틴 */
export function makeSampleRoutine(): Routine {
  const ids = ['base-벤치프레스', 'base-인클라인 벤치프레스', 'base-펙덱 플라이'];
  const exercises = ids
    .map((id) => BASE_EXERCISES.find((e) => e.id === id))
    .filter((e): e is Exercise => !!e)
    .map((e) => ({
      ...makeRoutineExercise(e),
      totalSets: 4,
      exerciseSec: 40,
      restSec: 90,
    }));
  const now = Date.now();
  return {
    id: uid('rt'),
    name: '가슴 데이 (예시)',
    exercises,
    createdAt: now,
    updatedAt: now,
  };
}

/** 빈 RoutineExercise 생성 (기본 시간값 포함) */
export function makeRoutineExercise(e: Exercise): RoutineExercise {
  return {
    exerciseId: e.id,
    name: e.name,
    bodyPart: e.bodyPart,
    equipment: e.equipment,
    totalSets: 3,
    exerciseSec: e.bodyPart === '유산소' ? 600 : 40,
    restSec: 60,
  };
}
