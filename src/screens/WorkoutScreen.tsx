import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { appAlert } from '../utils/dialog';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlateCalculator from '../components/PlateCalculator';
import PlateWeightInput from '../components/PlateWeightInput';
import { FAIL_REASONS } from '../data/fivexfive';
import { Btn, ProgressRing } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { colors, radius, spacing } from '../theme';
import {
  ExerciseRecord,
  READY_SEC,
  RoutineExercise,
  SetRecord,
  Unit,
  WorkoutDraft,
  WorkoutSession,
} from '../types';
import { playBeep, playRestEndChime } from '../utils/sound';
import { detectPRs, prLabel } from '../utils/strength';
import {
  completedSetCount,
  fmtClock,
  fmtDuration,
  parseNum,
  sessionVolume,
  totalSetCount,
} from '../utils/helpers';
import { buildSession, computeStatus, makeInitialRecords } from '../workout/session';
import { buildSteps, Step } from '../workout/steps';

type Props = NativeStackScreenProps<RootStackParamList, 'Workout'>;

interface Meta {
  exercises: RoutineExercise[];
  routineId: string | null;
  routineName: string;
  unit: Unit;
  startedAt: number;
  readySec: number;
  programId?: string;
  routine?: '5x5-A' | '5x5-B';
}

const TICK_MS = 200;
const KEEP_AWAKE_TAG = 'workout';

export default function WorkoutScreen({ navigation, route }: Props) {
  const { getRoutine, settings, draft, saveDraft, clearDraft, addSession, sessions } =
    useApp();
  const insets = useSafeAreaInsets();

  // 운동별 가장 최근 세션 기록 (이전 기록 불러오기용)
  const prevSetsByExercise = useMemo(() => {
    const map: Record<string, SetRecord[]> = {};
    for (const sess of sessions) {
      for (const rec of sess.records) {
        if (!map[rec.exerciseId]) map[rec.exerciseId] = rec.sets;
      }
    }
    return map;
  }, [sessions]);

  const [meta, setMeta] = useState<Meta | null>(null);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [displayMs, setDisplayMs] = useState(0); // 현재 단계에서의 경과 시간(ms)
  const [finished, setFinished] = useState(false);
  const [sessionMemo, setSessionMemo] = useState('');
  const [exited, setExited] = useState(false);
  const [plateOpen, setPlateOpen] = useState(false);
  // 세트 완료 시 횟수 기록 모달 대상
  const [completeSet, setCompleteSet] = useState<{ exIndex: number; setNo: number } | null>(null);
  // 휴식 단계별 사용자 지정 휴식 시간(초) 오버라이드
  const [restOverrides, setRestOverrides] = useState<Record<number, number>>({});

  const steps = useMemo(
    () => (meta ? buildSteps(meta.exercises, meta.readySec) : []),
    [meta]
  );

  // 완료 시 개인기록(PR) 감지
  const prs = useMemo(() => {
    if (!finished || !meta) return [];
    const temp: WorkoutSession = {
      id: 'temp',
      routineId: meta.routineId,
      routineName: meta.routineName,
      status: 'done',
      startedAt: meta.startedAt,
      endedAt: meta.startedAt + 1,
      durationSec: 0,
      unit: meta.unit,
      totalVolume: 0,
      records,
      memo: '',
    };
    return detectPRs(temp, sessions);
  }, [finished, meta, records, sessions]);

  // 엔진이 즉시 참조하는 ref들 (선언 순서 = effect 실행 순서)
  const stepsRef = useRef<Step[]>([]);
  const stepIndexRef = useRef(0);
  const runningRef = useRef(false);
  const finishedRef = useRef(false);
  const lastBeepRef = useRef(-1);
  const baseElapsedRef = useRef(0); // 현재 단계에서 누적된 경과(현재 진행 구간 제외)
  const segmentStartRef = useRef(0); // 현재 진행 구간 시작 시각
  const restOverridesRef = useRef<Record<number, number>>({});

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);
  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);
  useEffect(() => {
    restOverridesRef.current = restOverrides;
  }, [restOverrides]);

  // 현재 휴식 단계의 휴식 시간(초) 변경
  const setRestSec = (sec: number) => {
    const idx = stepIndexRef.current;
    setRestOverrides((prev) => ({ ...prev, [idx]: Math.max(5, sec) }));
  };

  // 현재 단계 경과 시간(ms)
  const curElapsed = () =>
    baseElapsedRef.current +
    (runningRef.current ? Date.now() - segmentStartRef.current : 0);

  // 단계 이동(경과 초기화). running 상태는 유지.
  const goToStep = (idx: number) => {
    stepIndexRef.current = idx;
    baseElapsedRef.current = 0;
    segmentStartRef.current = Date.now();
    lastBeepRef.current = -1;
    setStepIndex(idx);
    setDisplayMs(0);
  };

  // ---- 초기화 (1회) ----
  useEffect(() => {
    if (route.params?.resume && draft) {
      const readySec = draft.readySec ?? 0;
      const s = buildSteps(draft.exercises, readySec);
      const idx = Math.min(draft.stepIndex, Math.max(0, s.length - 1));
      setMeta({
        exercises: draft.exercises,
        routineId: draft.routineId,
        routineName: draft.routineName,
        unit: draft.unit,
        startedAt: draft.startedAt,
        readySec,
        programId: draft.programId,
        routine: draft.routine,
      });
      setRecords(draft.records);
      setStepIndex(idx);
      stepIndexRef.current = idx;
      baseElapsedRef.current = 0;
      segmentStartRef.current = Date.now();
      setDisplayMs(0);
      setRunning(false); // 복구는 일시정지 상태
      runningRef.current = false;
      return;
    }
    // 인라인 루틴(5×5 등 프로그램) — 저장되지 않은 임시 운동
    const inlineExs = route.params?.exercises;
    if (inlineExs && inlineExs.length > 0) {
      const exs = JSON.parse(JSON.stringify(inlineExs)) as RoutineExercise[];
      const readySec = settings.readyCountdown ? READY_SEC : 0;
      const startedAt = Date.now();
      setMeta({
        exercises: exs,
        routineId: null,
        routineName: route.params?.title ?? '5×5',
        unit: settings.unit,
        startedAt,
        readySec,
        programId: route.params?.programId,
        routine: route.params?.programRoutine,
      });
      setRecords(makeInitialRecords(exs));
      setStepIndex(0);
      stepIndexRef.current = 0;
      baseElapsedRef.current = 0;
      segmentStartRef.current = Date.now();
      setDisplayMs(0);
      setRunning(true);
      runningRef.current = true;
      return;
    }

    const id = route.params?.routineId;
    const routine = id ? getRoutine(id) : undefined;
    if (!routine || routine.exercises.length === 0) {
      appAlert('루틴 없음', '운동을 시작할 루틴을 찾을 수 없어요.');
      navigation.goBack();
      return;
    }
    const exs = JSON.parse(JSON.stringify(routine.exercises)) as RoutineExercise[];
    const readySec = settings.readyCountdown ? READY_SEC : 0;
    const s = buildSteps(exs, readySec);
    const startedAt = Date.now();
    setMeta({
      exercises: exs,
      routineId: routine.id,
      routineName: routine.name,
      unit: settings.unit,
      startedAt,
      readySec,
    });
    setRecords(makeInitialRecords(exs));
    setStepIndex(0);
    stepIndexRef.current = 0;
    baseElapsedRef.current = 0;
    segmentStartRef.current = Date.now();
    setDisplayMs(0);
    setRunning(true);
    runningRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 화면 켜짐 유지 ----
  useEffect(() => {
    if (settings.keepAwake) {
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    }
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [settings.keepAwake]);

  const buzz = useCallback(
    (style: 'light' | 'success' | 'warning') => {
      if (!settings.vibration) return;
      try {
        if (style === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (style === 'warning') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {
        // 햅틱 미지원 플랫폼(웹 등) 무시
      }
    },
    [settings.vibration]
  );

  const markSet = useCallback(
    (exIndex: number, setNo: number, patch: Partial<SetRecord>) => {
      setRecords((rs) =>
        rs.map((r, i) =>
          i !== exIndex
            ? r
            : {
                ...r,
                sets: r.sets.map((st) =>
                  st.setNo === setNo ? { ...st, ...patch } : st
                ),
              }
        )
      );
    },
    []
  );

  const doFinish = useCallback(() => {
    setFinished(true);
    finishedRef.current = true;
    setRunning(false);
    runningRef.current = false;
    buzz('success');
  }, [buzz]);

  // ---- 타이머 엔진 ----
  // 운동(exercise): 경과만 세고 자동 진행 X (탭)
  // 준비(ready): 카운트다운 후 자동으로 운동 시작
  // 휴식(rest): 카운트다운 후 자동 진행 X — 종료 후 초과 시간 카운트업, 탭으로 다음 세트
  const tick = useCallback(() => {
    if (finishedRef.current || !runningRef.current) return;
    const s = stepsRef.current;
    if (s.length === 0) return;
    const idx = stepIndexRef.current;
    const cur = s[idx];
    if (!cur) return;
    const elapsed =
      baseElapsedRef.current + (Date.now() - segmentStartRef.current);

    if (cur.type === 'exercise') {
      setDisplayMs(elapsed); // 카운트업 — 자동 진행 없음
      return;
    }

    if (cur.type === 'ready') {
      const remaining = cur.duration * 1000 - elapsed;
      if (remaining <= 0) {
        if (idx >= s.length - 1) {
          doFinish();
          return;
        }
        goToStep(idx + 1);
        buzz(s[idx + 1].type === 'exercise' ? 'success' : 'light');
        return;
      }
      if (settings.countdownBeep) {
        const secLeft = Math.ceil(remaining / 1000);
        if (secLeft <= 3 && secLeft > 0 && secLeft !== lastBeepRef.current) {
          lastBeepRef.current = secLeft;
          buzz('light');
          playBeep(880, 100);
        }
      }
      setDisplayMs(elapsed);
      return;
    }

    // 휴식: 자동 진행 없음. 3·2·1 신호음 + 종료 차임, 종료 후 초과 카운트업.
    const durSec = restOverridesRef.current[idx] ?? cur.duration;
    const remaining = durSec * 1000 - elapsed;
    if (settings.countdownBeep) {
      if (remaining > 0) {
        const secLeft = Math.ceil(remaining / 1000);
        if (secLeft <= 3 && secLeft !== lastBeepRef.current) {
          lastBeepRef.current = secLeft;
          buzz('light');
          playBeep(880, 110);
        }
      } else if (lastBeepRef.current !== 0) {
        lastBeepRef.current = 0;
        buzz('warning');
        playRestEndChime();
      }
    }
    setDisplayMs(elapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buzz, doFinish, settings.countdownBeep]);

  useEffect(() => {
    if (!running || finished) return;
    const id = setInterval(tick, TICK_MS);
    tick();
    return () => clearInterval(id);
  }, [running, finished, tick]);

  // ---- 임시 저장 (디바운스) ----
  useEffect(() => {
    if (!meta || finished || exited) return;
    const id = setTimeout(() => {
      const d: WorkoutDraft = {
        routineId: meta.routineId,
        routineName: meta.routineName,
        exercises: meta.exercises,
        records,
        stepIndex,
        startedAt: meta.startedAt,
        unit: meta.unit,
        readySec: meta.readySec,
        programId: meta.programId,
        routine: meta.routine,
        savedAt: Date.now(),
      };
      saveDraft(d);
    }, 700);
    return () => clearTimeout(id);
  }, [meta, records, stepIndex, finished, exited, saveDraft]);

  // ---- 컨트롤 ----
  function togglePause() {
    if (runningRef.current) {
      baseElapsedRef.current = curElapsed(); // 경과 누적 후 멈춤
      setRunning(false);
      runningRef.current = false;
    } else {
      segmentStartRef.current = Date.now();
      setRunning(true);
      runningRef.current = true;
    }
  }

  function gotoNext(mark?: 'complete' | 'skip') {
    const s = stepsRef.current;
    const idx = stepIndexRef.current;
    const cur = s[idx];
    if (cur && cur.type === 'exercise') {
      if (mark === 'complete') markSet(cur.exIndex, cur.setNo, { completed: true, skipped: false });
      if (mark === 'skip') markSet(cur.exIndex, cur.setNo, { skipped: true, completed: false });
    }
    if (idx >= s.length - 1) {
      doFinish();
      return;
    }
    goToStep(idx + 1);
    buzz('light');
  }

  // 현재 운동 세트를 "완료"하려 할 때 → 횟수 기록 모달 열기
  function requestCompleteSet() {
    const cur = stepsRef.current[stepIndexRef.current];
    if (!cur || cur.type !== 'exercise') return;
    setCompleteSet({ exIndex: cur.exIndex, setNo: cur.setNo });
  }

  // 모달에서 기록 후 완료 처리 + 다음 단계로
  function confirmCompleteSet() {
    if (!completeSet) return;
    markSet(completeSet.exIndex, completeSet.setNo, {
      completed: true,
      skipped: false,
    });
    setCompleteSet(null);
    gotoNext(); // 이미 완료 표시했으므로 mark 없이 진행
  }

  // 휴식 시간 ±조정: 남은 시간을 늘리면(=경과 줄이면) 더 길게
  function confirmEnd() {
    appAlert('운동 종료', '종료할까요? 지금까지 입력한 기록은 저장할 수 있어요.', [
      { text: '계속하기', style: 'cancel' },
      { text: '종료', style: 'destructive', onPress: doFinish },
    ]);
  }

  function saveAndExit() {
    if (!meta) return;
    const endedAt = Date.now();
    const session = buildSession({
      routineId: meta.routineId,
      routineName: meta.routineName,
      records,
      unit: meta.unit,
      startedAt: meta.startedAt,
      endedAt,
      status: computeStatus(records),
      memo: sessionMemo.trim(),
      programId: meta.programId,
      routine: meta.routine,
    });
    addSession(session);
    clearDraft();
    setExited(true);
    navigation.goBack();
  }

  function discardAndExit() {
    appAlert('저장 안 함', '이번 운동 기록을 저장하지 않고 나갈까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '저장 안 함',
        style: 'destructive',
        onPress: () => {
          clearDraft();
          setExited(true);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!meta) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  // ---- 파생값 ----
  const curStep = steps[stepIndex];
  const isRest = !!curStep && curStep.type === 'rest';
  const isReady = !!curStep && curStep.type === 'ready';
  const isExercise = !!curStep && curStep.type === 'exercise';
  const stepDurMs = curStep ? curStep.duration * 1000 : 1;
  const elapsedMs = displayMs; // 현재 단계 경과
  const remainingCalc = Math.max(0, stepDurMs - elapsedMs);

  // 휴식: 사용자 지정 시간 반영 + 종료 후 초과 시간(음수면 초과)
  const restDurSec =
    isRest && curStep ? restOverrides[stepIndex] ?? curStep.duration : 0;
  const restDurMs = restDurSec * 1000;
  const restRemainingMs = isRest ? restDurMs - elapsedMs : 0;
  const restWarning = isRest && restRemainingMs <= 3000 && restRemainingMs > 0;
  const restOver = isRest && restRemainingMs <= 0;

  // 준비 직후 운동 시작 ~0.8초 "GO!"
  const showGo =
    isExercise &&
    steps[stepIndex - 1]?.type === 'ready' &&
    running &&
    elapsedMs >= 0 &&
    elapsedMs < 800;

  const phaseColor = finished
    ? colors.sub
    : !running
    ? colors.sub
    : showGo
    ? colors.primary
    : isReady
    ? colors.warn
    : isRest
    ? restOver
      ? colors.primary
      : restWarning
      ? colors.danger
      : colors.rest
    : colors.exercise;
  const phaseLabel = finished
    ? '운동 완료'
    : !running
    ? '일시정지'
    : isReady
    ? '준비'
    : isRest
    ? restOver
      ? '휴식 종료'
      : restWarning
      ? '곧 시작!'
      : '휴식 중'
    : '운동 중';
  const curEx = curStep ? records[curStep.exIndex] : undefined;
  const nextStepInfo = describeNext(steps, stepIndex, records);
  const prevSets = curEx ? prevSetsByExercise[curEx.exerciseId] : undefined;
  // 링: 운동=스톱워치(1분에 한 바퀴) / 준비=남은 / 휴식=남은(초과 시 0)
  const ringProgress = finished
    ? 0
    : isExercise
    ? (elapsedMs % 60000) / 60000
    : isRest
    ? Math.max(0, Math.min(1, restRemainingMs / restDurMs))
    : Math.max(0, Math.min(1, remainingCalc / stepDurMs));
  // 큰 텍스트: GO! / 준비(3,2,1) / 운동=경과 / 휴식=남음(초과 시 +경과)
  const bigText = showGo
    ? 'GO!'
    : isReady
    ? String(Math.max(1, Math.ceil(remainingCalc / 1000)))
    : isExercise
    ? fmtClock(elapsedMs / 1000)
    : isRest
    ? restOver
      ? '+' + fmtClock(-restRemainingMs / 1000)
      : fmtClock(restRemainingMs / 1000)
    : fmtClock(remainingCalc / 1000);
  const canTapAdvance = (isExercise || isRest) && running && !finished;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* 상단 바 */}
      <View style={styles.topBar}>
        <Text style={styles.routineTitle} numberOfLines={1}>
          {meta.routineName}
        </Text>
        <Pressable onPress={confirmEnd} hitSlop={10} style={styles.endBtn}>
          <Ionicons name="close" size={18} color={colors.danger} />
          <Text style={styles.endText}>종료</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* 타이머 (원형 진행 링) — 운동 중엔 탭하면 다음으로 */}
          <Pressable
            style={({ pressed }) => [
              styles.timerWrap,
              canTapAdvance && styles.timerWrapTappable,
              pressed && canTapAdvance && { opacity: 0.8, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() => {
              if (!canTapAdvance) return;
              if (isExercise) requestCompleteSet();
              else if (isRest) gotoNext();
            }}
          >
            <View style={[styles.phasePill, { backgroundColor: phaseColor + '1F', borderColor: phaseColor }]}>
              <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
              <Text style={[styles.phaseLabel, { color: phaseColor }]}>{phaseLabel}</Text>
            </View>
            <ProgressRing
              size={262}
              stroke={16}
              progress={ringProgress}
              color={phaseColor}
              running={running && !finished}
            >
              <Text
                style={[
                  styles.timer,
                  (isReady || showGo) && { fontSize: 96, color: phaseColor },
                ]}
              >
                {bigText}
              </Text>
              {curEx && curStep && (
                <Text style={styles.setIndicator}>
                  {curStep.setNo} / {curEx.sets.length} 세트
                </Text>
              )}
            </ProgressRing>
            {curEx && <Text style={styles.curExName}>{curEx.exerciseName}</Text>}
            {curStep && meta.exercises[curStep.exIndex]?.supersetGroup && (
              <View style={styles.ssBadge}>
                <Ionicons name="link" size={12} color={colors.accent} />
                <Text style={styles.ssBadgeText}>슈퍼셋</Text>
              </View>
            )}
            {canTapAdvance ? (
              <View style={styles.tapHint}>
                <Ionicons name="hand-left" size={22} color={colors.onPrimary} />
                <Text style={styles.tapHintText}>
                  {isExercise
                    ? '탭하여 세트 완료'
                    : restOver
                    ? '휴식 종료 · 탭하여 다음 세트'
                    : '탭하면 다음 세트로'}
                </Text>
              </View>
            ) : (
              <Text style={styles.nextUp}>{nextStepInfo}</Text>
            )}
          </Pressable>

          {/* 컨트롤 */}
          {!finished && (
            <View style={styles.controls}>
              <Btn
                title={running ? '일시정지' : '재개'}
                icon={running ? 'pause' : 'play'}
                variant="secondary"
                onPress={togglePause}
                style={{ flex: 1 }}
              />
              {isReady ? (
                <Btn
                  title="바로 시작"
                  icon="play"
                  variant="primary"
                  onPress={() => gotoNext()}
                  style={{ flex: 1 }}
                />
              ) : isRest ? (
                <Btn
                  title="다음 세트 시작"
                  icon="play-skip-forward"
                  variant="primary"
                  onPress={() => gotoNext()}
                  style={{ flex: 1 }}
                />
              ) : (
                <Btn
                  title="세트 완료"
                  icon="checkmark"
                  variant="accent"
                  onPress={requestCompleteSet}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          )}

          {!finished && (
            <View style={styles.controls2}>
              {isRest ? (
                <View style={styles.restTimeRow}>
                  <Text style={styles.restTimeLabel}>휴식 시간</Text>
                  <Pressable style={styles.restStepBtn} onPress={() => setRestSec(restDurSec - 10)}>
                    <Text style={styles.restStepText}>−</Text>
                  </Pressable>
                  <Text style={styles.restTimeValue}>{fmtClock(restDurSec)}</Text>
                  <Pressable style={styles.restStepBtn} onPress={() => setRestSec(restDurSec + 10)}>
                    <Text style={styles.restStepText}>+</Text>
                  </Pressable>
                </View>
              ) : isReady ? null : (
                <Btn
                  title="이 세트 건너뛰기"
                  small
                  variant="ghost"
                  onPress={() => gotoNext('skip')}
                />
              )}
            </View>
          )}

          {/* 이전 기록 */}
          {curEx && prevSets && (
            <Text style={styles.prevRecord}>
              지난 기록: {formatPrev(prevSets, meta.unit)}
            </Text>
          )}

          {/* 현재 운동 세트 입력 */}
          {curEx && curStep && (
            <View style={styles.setTable}>
              <Pressable onPress={() => setPlateOpen(true)} style={styles.plateBtn}>
                <Ionicons name="barbell-outline" size={15} color={colors.primary} />
                <Text style={styles.plateBtnText}>원판 계산기</Text>
              </Pressable>
              <Text style={styles.setHint}>
                세트 번호를 눌러 워밍업(W)·드롭(D) 지정
              </Text>
              <View style={styles.setHeaderRow}>
                <Text style={[styles.th, { width: 44 }]}>세트</Text>
                <Text style={[styles.th, { flex: 1 }]}>무게({meta.unit})</Text>
                <Text style={[styles.th, { flex: 1 }]}>횟수</Text>
                {settings.showRPE && (
                  <Text style={[styles.th, { width: 44 }]}>RPE</Text>
                )}
                <Text style={[styles.th, { width: 44 }]}>완료</Text>
              </View>
              {curEx.sets.map((set) => {
                const isCurrent = curStep.setNo === set.setNo;
                return (
                  <View
                    key={set.setNo}
                    style={[styles.setRow, isCurrent && styles.setRowActive]}
                  >
                    <Pressable
                      style={{ width: 44, alignItems: 'center' }}
                      onPress={() => {
                        const next =
                          set.type === undefined
                            ? 'warmup'
                            : set.type === 'warmup'
                            ? 'drop'
                            : undefined;
                        markSet(curStep.exIndex, set.setNo, { type: next });
                      }}
                    >
                      <Text
                        style={[
                          styles.setNo,
                          set.skipped && styles.skipped,
                          set.type === 'warmup' && { color: colors.warn },
                          set.type === 'drop' && { color: '#C08BFF' },
                        ]}
                      >
                        {set.type === 'warmup'
                          ? 'W'
                          : set.type === 'drop'
                          ? 'D'
                          : set.setNo}
                        {set.skipped ? '⤬' : ''}
                      </Text>
                    </Pressable>
                    <View style={{ flex: 1, paddingHorizontal: 4 }}>
                      <TextInput
                        style={styles.input}
                        keyboardType="decimal-pad"
                        value={set.weight ? String(set.weight) : ''}
                        placeholder={placeholderFor(prevSets, set.setNo, 'weight')}
                        placeholderTextColor={colors.faint}
                        onChangeText={(t) =>
                          markSet(curStep.exIndex, set.setNo, { weight: parseNum(t) })
                        }
                      />
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 4 }}>
                      <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        value={set.reps ? String(set.reps) : ''}
                        placeholder={placeholderFor(prevSets, set.setNo, 'reps')}
                        placeholderTextColor={colors.faint}
                        onChangeText={(t) =>
                          markSet(curStep.exIndex, set.setNo, {
                            reps: Math.round(parseNum(t)),
                          })
                        }
                      />
                    </View>
                    {settings.showRPE && (
                      <View style={{ width: 44, paddingHorizontal: 2 }}>
                        <TextInput
                          style={styles.input}
                          keyboardType="number-pad"
                          value={set.rpe ? String(set.rpe) : ''}
                          placeholder="-"
                          placeholderTextColor={colors.faint}
                          onChangeText={(t) => {
                            const v = Math.min(10, Math.round(parseNum(t)));
                            markSet(curStep.exIndex, set.setNo, {
                              rpe: v > 0 ? v : undefined,
                            });
                          }}
                        />
                      </View>
                    )}
                    <Pressable
                      style={{ width: 44, alignItems: 'center' }}
                      onPress={() => {
                        const isCurrentExerciseSet =
                          curStep.type === 'exercise' &&
                          curStep.setNo === set.setNo;
                        if (isCurrentExerciseSet && !set.completed) {
                          // 현재 세트 체크 → 횟수 기록 모달 열기
                          requestCompleteSet();
                        } else {
                          markSet(curStep.exIndex, set.setNo, {
                            completed: !set.completed,
                            skipped: false,
                          });
                        }
                      }}
                    >
                      <View
                        style={[styles.check, set.completed && styles.checkOn]}
                      >
                        {set.completed && (
                          <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text>
                        )}
                      </View>
                    </Pressable>
                  </View>
                );
              })}

              {/* 세트 추가/삭제 */}
              <View style={styles.setEditRow}>
                <Pressable
                  onPress={() => addSetToCurrent(curStep.exIndex)}
                  style={styles.setEditBtn}
                >
                  <Text style={styles.setEditText}>+ 세트 추가</Text>
                </Pressable>
                {curEx.sets.length > 1 && (
                  <Pressable
                    onPress={() => removeLastSet(curStep.exIndex)}
                    style={styles.setEditBtn}
                  >
                    <Text style={[styles.setEditText, { color: colors.danger }]}>
                      − 마지막 세트
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* 메모 */}
              <TextInput
                style={styles.memo}
                placeholder="운동 메모 (예: 오른쪽 어깨 약간 통증)"
                placeholderTextColor={colors.faint}
                value={curEx.memo}
                onChangeText={(t) =>
                  setRecords((rs) =>
                    rs.map((r, i) =>
                      i === curStep.exIndex ? { ...r, memo: t } : r
                    )
                  )
                }
                multiline
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 원판 계산기 */}
      <PlateCalculator
        visible={plateOpen}
        onClose={() => setPlateOpen(false)}
        initialWeight={
          curEx && curStep
            ? curEx.sets.find((s) => s.setNo === curStep.setNo)?.weight
            : undefined
        }
        unit={meta.unit}
      />

      {/* 세트 완료 — 횟수 기록 모달 */}
      <Modal
        transparent
        visible={completeSet !== null}
        animationType="fade"
        onRequestClose={() => setCompleteSet(null)}
      >
        <View style={styles.recBackdrop}>
          {completeSet &&
            (() => {
              const rec = records[completeSet.exIndex];
              const set = rec?.sets.find((s) => s.setNo === completeSet.setNo);
              if (!rec || !set) return null;
              return (
                <View style={styles.recCard}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.recExName}>{rec.exerciseName}</Text>
                    <Text style={styles.recSetNo}>{completeSet.setNo}세트 완료</Text>
                    <Text style={styles.recLabel}>몇 회 하셨나요?</Text>
                    <View style={styles.recRepsRow}>
                      <Pressable
                        style={styles.recStep}
                        onPress={() =>
                          markSet(completeSet.exIndex, completeSet.setNo, {
                            reps: Math.max(0, set.reps - 1),
                          })
                        }
                      >
                        <Text style={styles.recStepText}>−</Text>
                      </Pressable>
                      <TextInput
                        style={styles.recRepsInput}
                        keyboardType="number-pad"
                        value={set.reps ? String(set.reps) : ''}
                        placeholder="0"
                        placeholderTextColor={colors.faint}
                        onChangeText={(t) =>
                          markSet(completeSet.exIndex, completeSet.setNo, {
                            reps: Math.round(parseNum(t)),
                          })
                        }
                      />
                      <Pressable
                        style={styles.recStep}
                        onPress={() =>
                          markSet(completeSet.exIndex, completeSet.setNo, {
                            reps: set.reps + 1,
                          })
                        }
                      >
                        <Text style={styles.recStepText}>+</Text>
                      </Pressable>
                    </View>

                    {/* 목표 미달 시 실패 원인 (선택) */}
                    {(() => {
                      const target = meta.exercises[completeSet.exIndex]?.targetReps ?? 0;
                      if (!(target > 0) || set.reps >= target) return null;
                      return (
                        <View style={styles.failBox}>
                          <Text style={styles.failTitle}>목표 {target}회 미달 — 실패 원인 (선택)</Text>
                          <View style={styles.failChips}>
                            {FAIL_REASONS.map((r) => {
                              const on = set.failReason === r;
                              return (
                                <Pressable
                                  key={r}
                                  onPress={() =>
                                    markSet(completeSet.exIndex, completeSet.setNo, {
                                      failReason: on ? undefined : r,
                                    })
                                  }
                                  style={[styles.failChip, on && styles.failChipOn]}
                                >
                                  <Text style={[styles.failChipText, on && styles.failChipTextOn]}>{r}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })()}

                    {/* 원판으로 무게 입력 */}
                    <PlateWeightInput
                      weight={set.weight}
                      unit={meta.unit}
                      equipment={rec.equipment}
                      onChange={(w) =>
                        markSet(completeSet.exIndex, completeSet.setNo, { weight: w })
                      }
                    />

                    <Btn
                      title="완료하고 다음으로 →"
                      icon="checkmark"
                      onPress={confirmCompleteSet}
                      style={{ marginTop: spacing.lg }}
                    />
                    <Btn
                      title="취소"
                      variant="ghost"
                      onPress={() => setCompleteSet(null)}
                      style={{ marginTop: 8 }}
                    />
                  </ScrollView>
                </View>
              );
            })()}
        </View>
      </Modal>

      {/* 완료 요약 오버레이 */}
      {finished && (
        <View style={styles.finishOverlay}>
          <ScrollView contentContainerStyle={styles.finishCard}>
            <Text style={styles.finishEmoji}>🎉</Text>
            <Text style={styles.finishTitle}>
              {computeStatus(records) === 'done' ? '운동 완료!' : '운동 종료'}
            </Text>
            <Text style={styles.finishMessage}>
              {computeStatus(records) === 'done'
                ? '오늘도 끝까지 해냈어요! 수고하셨습니다 💪'
                : '여기까지도 충분히 잘했어요. 다음엔 끝까지! 🔥'}
            </Text>
            <View style={styles.finishStats}>
              <FinishStat
                label="소요 시간"
                value={fmtDuration((Date.now() - meta.startedAt) / 1000)}
              />
              <FinishStat
                label="총 볼륨"
                value={`${sessionVolume(records).toLocaleString()}${meta.unit}`}
              />
              <FinishStat
                label="완료 세트"
                value={`${completedSetCount(records)}/${totalSetCount(records)}`}
              />
            </View>

            {/* 개인기록(PR) 축하 */}
            {prs.length > 0 && (
              <View style={styles.prBox}>
                <Text style={styles.prHeader}>🏆 새 개인기록 {prs.length}개!</Text>
                {prs.map((pr) => (
                  <View key={`${pr.exerciseId}-${pr.type}`} style={styles.prRow}>
                    <Ionicons name="trophy" size={15} color={colors.warn} />
                    <Text style={styles.prName}>{pr.exerciseName}</Text>
                    <Text style={styles.prVal}>{prLabel(pr)}</Text>
                  </View>
                ))}
              </View>
            )}

            <TextInput
              style={styles.memo}
              placeholder="오늘 운동 메모 (선택)"
              placeholderTextColor={colors.faint}
              value={sessionMemo}
              onChangeText={setSessionMemo}
              multiline
            />
            <Btn title="기록 저장하고 닫기" onPress={saveAndExit} />
            <Btn
              title="저장하지 않고 나가기"
              variant="ghost"
              onPress={discardAndExit}
              style={{ marginTop: 8 }}
            />
          </ScrollView>
        </View>
      )}
    </View>
  );

  function addSetToCurrent(exIndex: number) {
    setRecords((rs) =>
      rs.map((r, i) => {
        if (i !== exIndex) return r;
        const nextNo = r.sets.length + 1;
        return {
          ...r,
          sets: [
            ...r.sets,
            { setNo: nextNo, weight: 0, reps: 0, completed: false, skipped: false },
          ],
        };
      })
    );
  }

  function removeLastSet(exIndex: number) {
    setRecords((rs) =>
      rs.map((r, i) =>
        i === exIndex && r.sets.length > 1
          ? { ...r, sets: r.sets.slice(0, -1) }
          : r
      )
    );
  }

}

function FinishStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.finishStatValue}>{value}</Text>
      <Text style={styles.finishStatLabel}>{label}</Text>
    </View>
  );
}

function describeNext(
  steps: Step[],
  idx: number,
  records: ExerciseRecord[]
): string {
  const next = steps[idx + 1];
  if (!next) return '마지막 단계예요';
  const ex = records[next.exIndex];
  if (next.type === 'rest') return `다음: 휴식 ${fmtClock(next.duration)}`;
  return `다음: ${ex?.exerciseName ?? ''} ${next.setNo}세트`;
}

function formatPrev(sets: SetRecord[], unit: Unit): string {
  return sets
    .filter((s) => s.weight > 0 || s.reps > 0)
    .map((s) => `${s.weight}${unit}×${s.reps}`)
    .join(', ');
}

function placeholderFor(
  prev: SetRecord[] | undefined,
  setNo: number,
  field: 'weight' | 'reps'
): string {
  if (!prev) return field === 'weight' ? '0' : '0';
  const p = prev.find((s) => s.setNo === setNo);
  if (!p) return field === 'weight' ? '0' : '0';
  return String(field === 'weight' ? p.weight : p.reps);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  routineTitle: { color: colors.text, fontSize: 17, fontWeight: '800', flex: 1, letterSpacing: -0.3 },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  endText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  timerWrap: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm },
  timerWrapTappable: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(203,251,69,0.04)',
    paddingVertical: spacing.lg,
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    marginBottom: spacing.xl,
  },
  phaseDot: { width: 7, height: 7, borderRadius: 4 },
  phaseLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  timer: {
    color: colors.text,
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  curExName: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: spacing.xl, letterSpacing: -0.4 },
  ssBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  ssBadgeText: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  setHint: { color: colors.faint, fontSize: 11, marginBottom: spacing.sm },
  setIndicator: { color: colors.sub, fontSize: 15, marginTop: 4, fontWeight: '700' },
  nextUp: { color: colors.faint, fontSize: 13, marginTop: spacing.sm, fontWeight: '600' },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
    paddingHorizontal: 26,
    paddingVertical: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  tapHintText: { color: colors.onPrimary, fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  controls: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  controls2: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
    justifyContent: 'center',
  },
  restTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  restTimeLabel: { color: colors.sub, fontSize: 13, fontWeight: '700' },
  restStepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restStepText: { color: colors.text, fontSize: 20, fontWeight: '800' },
  restTimeValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    minWidth: 52,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  prevRecord: {
    color: colors.accent,
    fontSize: 13,
    marginTop: spacing.lg,
    fontWeight: '600',
  },
  setTable: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  plateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  plateBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: { color: colors.sub, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  setRowActive: { backgroundColor: '#13203a' },
  setNo: {
    width: 44,
    textAlign: 'center',
    color: colors.text,
    fontWeight: '800',
  },
  skipped: { color: colors.danger, textDecorationLine: 'line-through' },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  setEditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  setEditBtn: { padding: spacing.sm },
  setEditText: { color: colors.primary, fontWeight: '700' },
  memo: {
    marginTop: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  recBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  recCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '88%',
    backgroundColor: colors.card2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  recExName: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  recSetNo: { color: colors.accent, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  recLabel: { color: colors.sub, fontSize: 13, fontWeight: '600' },
  failBox: {
    backgroundColor: 'rgba(255,176,32,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,176,32,0.3)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  failTitle: { color: colors.warn, fontSize: 12, fontWeight: '800', marginBottom: 8 },
  failChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  failChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  failChipOn: { backgroundColor: colors.warn, borderColor: colors.warn },
  failChipText: { color: colors.sub, fontSize: 12, fontWeight: '700' },
  failChipTextOn: { color: '#0c0d10', fontWeight: '800' },
  recRepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  recStep: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recStepText: { color: colors.text, fontSize: 26, fontWeight: '800' },
  recRepsInput: {
    minWidth: 96,
    textAlign: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 36,
    fontWeight: '900',
    paddingVertical: 8,
  },
  recWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  recWeightInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  recUnit: { color: colors.sub, fontSize: 15, fontWeight: '700' },
  finishOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,10,14,0.96)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  finishCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  finishEmoji: { fontSize: 48, textAlign: 'center' },
  finishTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  finishMessage: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  finishStats: {
    flexDirection: 'row',
    marginVertical: spacing.lg,
  },
  prBox: {
    backgroundColor: '#1c1a10',
    borderWidth: 1,
    borderColor: colors.warn,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  prHeader: { color: colors.warn, fontWeight: '800', fontSize: 14, marginBottom: 8 },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 3 },
  prName: { color: colors.text, fontSize: 13, fontWeight: '700', flex: 1 },
  prVal: { color: colors.warn, fontSize: 13, fontWeight: '700' },
  finishStatValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  finishStatLabel: { color: colors.sub, fontSize: 12, marginTop: 4 },
});
