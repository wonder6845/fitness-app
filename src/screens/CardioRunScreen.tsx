import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { colors, radius, spacing } from '../theme';
import { Equipment } from '../types';
import { appAlert } from '../utils/dialog';
import { getCardioStats, isHealthAvailable } from '../utils/health';
import { fmtClock, parseNum } from '../utils/helpers';
import { buildSession } from '../workout/session';

type Props = NativeStackScreenProps<RootStackParamList, 'CardioRun'>;

// 자유 유산소 종목 (GPS: 야외 종목만 시도)
const ACTIVITIES: { name: string; emoji: string; equipment: Equipment; gps: boolean }[] = [
  { name: '야외 러닝', emoji: '🏃', equipment: '맨몸', gps: true },
  { name: '걷기', emoji: '🚶', equipment: '맨몸', gps: true },
  { name: '등산', emoji: '⛰️', equipment: '맨몸', gps: true },
  { name: '러닝머신', emoji: '📟', equipment: '머신', gps: false },
  { name: '사이클', emoji: '🚴', equipment: '머신', gps: false },
  { name: '로잉머신', emoji: '🚣', equipment: '머신', gps: false },
];

type Phase = 'idle' | 'running' | 'paused' | 'done';
const KEEP_AWAKE_TAG = 'cardio-run';

export default function CardioRunScreen({ navigation }: Props) {
  const { addSession, bodyLog } = useApp();
  const insets = useSafeAreaInsets();

  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [displayMs, setDisplayMs] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [hr, setHr] = useState<number | null>(null);
  const [gpsOn, setGpsOn] = useState<boolean | null>(null); // null=미시도
  const [saved, setSaved] = useState(false);

  // 경과 시간 엔진 (일시정지 지원)
  const baseRef = useRef(0);
  const segStartRef = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  const startedAtRef = useRef(0);
  const distanceRef = useRef(0);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastPointRef = useRef<Location.LocationObject | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    distanceRef.current = distanceKm;
  }, [distanceKm]);

  const elapsed = () =>
    baseRef.current +
    (phaseRef.current === 'running' ? Date.now() - segStartRef.current : 0);

  // 타이머 틱
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setDisplayMs(elapsed()), 500);
    return () => clearInterval(id);
  }, [phase]);

  // 심박 (Apple Watch 있을 때만): 10초마다 평균 심박 갱신
  useEffect(() => {
    if (phase !== 'running' || !isHealthAvailable()) return;
    let alive = true;
    const query = async () => {
      const { avgHr } = await getCardioStats(startedAtRef.current, Date.now());
      if (alive && avgHr) setHr(avgHr);
    };
    query();
    const id = setInterval(query, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [phase]);

  // GPS 시작 (야외 종목만)
  async function startGps() {
    if (!activity.gps) {
      setGpsOn(false);
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsOn(false);
        return;
      }
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (loc) => {
          const prev = lastPointRef.current;
          lastPointRef.current = loc;
          if (phaseRef.current !== 'running' || !prev) return;
          if ((loc.coords.accuracy ?? 99) > 40) return; // 부정확 샘플 무시
          const d = haversineKm(prev.coords, loc.coords);
          if (d > 0 && d < 0.2) {
            // 순간이동(신호 튐) 방지
            setDistanceKm((x) => Math.round((x + d) * 1000) / 1000);
          }
        }
      );
      setGpsOn(true);
    } catch {
      setGpsOn(false);
    }
  }

  function stopGps() {
    watchRef.current?.remove();
    watchRef.current = null;
    lastPointRef.current = null;
  }

  function start() {
    startedAtRef.current = Date.now();
    baseRef.current = 0;
    segStartRef.current = Date.now();
    setDisplayMs(0);
    setPhase('running');
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    startGps();
  }
  function pause() {
    baseRef.current += Date.now() - segStartRef.current;
    setPhase('paused');
    setDisplayMs(baseRef.current);
  }
  function resume() {
    segStartRef.current = Date.now();
    setPhase('running');
  }
  function finish() {
    if (phaseRef.current === 'running') {
      baseRef.current += Date.now() - segStartRef.current;
    }
    setDisplayMs(baseRef.current);
    setPhase('done');
    stopGps();
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }
  function confirmFinish() {
    appAlert('운동 종료', '이번 유산소를 종료할까요?', [
      { text: '계속하기', style: 'cancel' },
      { text: '종료', style: 'destructive', onPress: finish },
    ]);
  }

  useEffect(() => {
    return () => {
      stopGps();
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, []);

  // 파생값
  const min = displayMs / 60000;
  const paceSecPerKm = distanceKm > 0.01 ? (displayMs / 1000) / distanceKm : null;
  const paceText = paceSecPerKm
    ? `${Math.floor(paceSecPerKm / 60)}'${String(Math.round(paceSecPerKm % 60)).padStart(2, '0')}"`
    : `--'--"`;

  // 칼로리 추정: 신체기록 체중(없으면 70kg) × 거리 계수, 거리 없으면 시간 기반
  const weightKg = useMemo(() => {
    const w = bodyLog
      .filter((b) => b.metric === 'weight')
      .sort((a, b) => b.ts - a.ts)[0];
    return w ? w.value : 70;
  }, [bodyLog]);
  const kcal = useMemo(() => {
    const kmFactor = activity.name === '걷기' ? 0.55 : 1.0;
    if (distanceKm > 0.05) return Math.round(weightKg * distanceKm * kmFactor);
    const perMin = activity.name === '걷기' ? 4 : activity.name === '야외 러닝' ? 10 : 8;
    return Math.round(min * perMin);
  }, [distanceKm, min, weightKg, activity]);

  function save() {
    const endedAt = Date.now();
    const durationSec = Math.max(1, Math.round(displayMs / 1000));
    const session = buildSession({
      routineId: null,
      routineName: `${activity.emoji} ${activity.name}`,
      records: [
        {
          exerciseId: `base-${activity.name}`,
          exerciseName: activity.name,
          bodyPart: '유산소',
          equipment: activity.equipment,
          sets: [
            {
              setNo: 1,
              weight: 0,
              reps: 0,
              completed: true,
              skipped: false,
              durationSec,
              distanceKm: distanceKm > 0 ? Math.round(distanceKm * 100) / 100 : undefined,
              avgHr: hr ?? undefined,
            },
          ],
          memo: '',
        },
      ],
      unit: 'kg',
      startedAt: startedAtRef.current,
      endedAt,
      status: 'done',
    });
    addSession(session);
    setSaved(true);
    setTimeout(() => navigation.goBack(), 900);
  }

  const running = phase === 'running';

  // ── 화면 ──
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      {/* 상단바 */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>
          {activity.emoji} {phase === 'idle' ? '자유 유산소' : activity.name}
        </Text>
        {phase === 'idle' ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.sub} />
          </Pressable>
        ) : phase !== 'done' ? (
          <Pressable onPress={confirmFinish} hitSlop={10} style={styles.endChip}>
            <Text style={styles.endChipText}>종료</Text>
          </Pressable>
        ) : null}
      </View>

      {phase === 'idle' && (
        <ScrollView contentContainerStyle={styles.idleWrap}>
          <Text style={styles.idleLead}>종목을 고르고 시작하세요</Text>
          <View style={styles.actGrid}>
            {ACTIVITIES.map((a) => (
              <Pressable
                key={a.name}
                onPress={() => setActivity(a)}
                style={[styles.actChip, activity.name === a.name && styles.actChipOn]}
              >
                <Text style={styles.actEmoji}>{a.emoji}</Text>
                <Text
                  style={[
                    styles.actName,
                    activity.name === a.name && { color: colors.onPrimary },
                  ]}
                >
                  {a.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.gpsNote}>
            {activity.gps
              ? '📍 야외 종목은 GPS로 거리·페이스를 자동 측정해요'
              : '실내 종목은 운동 후 거리를 직접 입력해요'}
            {isHealthAvailable() ? '\n⌚ Apple Watch 심박을 실시간으로 표시해요' : ''}
          </Text>
          <Pressable onPress={start} style={styles.startBtn}>
            <Text style={styles.startBtnText}>시작</Text>
          </Pressable>
        </ScrollView>
      )}

      {(phase === 'running' || phase === 'paused') && (
        <View style={styles.runWrap}>
          {/* 큰 거리 */}
          <Text style={styles.bigDistance}>{distanceKm.toFixed(2)}</Text>
          <Text style={styles.bigUnit}>킬로미터</Text>

          {/* 실시간 지표 */}
          <View style={styles.metricsRow}>
            <Metric value={fmtClock(displayMs / 1000)} label="시간" />
            <View style={styles.mline} />
            <Metric value={paceText} label="평균 페이스" />
            {(isHealthAvailable() || hr) && (
              <>
                <View style={styles.mline} />
                <Metric value={hr ? `${hr}` : '--'} label="심박수 ♥" hot />
              </>
            )}
          </View>

          {/* GPS 상태 / 수동 거리 조절 */}
          {gpsOn ? (
            <Text style={styles.gpsBadge}>📍 GPS 측정 중</Text>
          ) : (
            <View style={styles.manualWrap}>
              <Text style={styles.manualLabel}>
                {activity.gps ? 'GPS를 사용할 수 없어 수동 입력 모드예요' : '거리 (수동)'}
              </Text>
              <View style={styles.manualRow}>
                <Pressable
                  style={styles.manualBtn}
                  onPress={() =>
                    setDistanceKm((x) => Math.max(0, Math.round((x - 0.1) * 100) / 100))
                  }
                >
                  <Text style={styles.manualBtnText}>−0.1</Text>
                </Pressable>
                <Pressable
                  style={styles.manualBtn}
                  onPress={() => setDistanceKm((x) => Math.round((x + 0.1) * 100) / 100)}
                >
                  <Text style={styles.manualBtnText}>+0.1</Text>
                </Pressable>
                <Text style={styles.manualUnit}>km</Text>
              </View>
            </View>
          )}

          {/* 일시정지/재개 */}
          <View style={styles.controlRow}>
            {running ? (
              <Pressable onPress={pause} style={styles.pauseBtn}>
                <Ionicons name="pause" size={38} color={colors.onPrimary} />
              </Pressable>
            ) : (
              <>
                <Pressable onPress={finish} style={[styles.pauseBtn, styles.stopBtn]}>
                  <Ionicons name="stop" size={34} color="#fff" />
                </Pressable>
                <Pressable onPress={resume} style={styles.pauseBtn}>
                  <Ionicons name="play" size={38} color={colors.onPrimary} />
                </Pressable>
              </>
            )}
          </View>
          {phase === 'paused' && <Text style={styles.pausedText}>일시정지됨</Text>}
        </View>
      )}

      {phase === 'done' && (
        <ScrollView contentContainerStyle={styles.doneWrap}>
          <Text style={styles.doneTitle}>수고했어요! 🎉</Text>
          <Text style={styles.bigDistance}>{distanceKm.toFixed(2)}</Text>
          <Text style={styles.bigUnit}>킬로미터</Text>

          <View style={styles.summaryCard}>
            <Row label="종목" value={`${activity.emoji} ${activity.name}`} />
            <Row label="시간" value={fmtClock(displayMs / 1000)} />
            <Row label="평균 페이스" value={`${paceText}/km`} />
            {hr ? <Row label="평균 심박 ♥" value={`${hr} bpm`} hot /> : null}
            <Row label="칼로리 (추정)" value={`${kcal} kcal`} />
          </View>

          {/* 거리 보정 (실내/GPS 오차) */}
          <View style={styles.fixRow}>
            <Text style={styles.manualLabel}>거리 수정</Text>
            <TextInput
              style={styles.fixInput}
              keyboardType="decimal-pad"
              defaultValue={distanceKm > 0 ? String(Math.round(distanceKm * 100) / 100) : ''}
              placeholder="0.0"
              placeholderTextColor={colors.faint}
              onChangeText={(t) => {
                const v = parseNum(t);
                setDistanceKm(v > 0 ? v : 0);
              }}
            />
            <Text style={styles.manualUnit}>km</Text>
          </View>

          <Btn
            title={saved ? '저장됨 ✓' : '기록 저장'}
            onPress={save}
            disabled={saved}
            style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
          />
          <Btn
            title="저장 안 하고 나가기"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}
          />
        </ScrollView>
      )}
    </View>
  );
}

function Metric({ value, label, hot }: { value: string; label: string; hot?: boolean }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[styles.metricValue, hot && { color: '#FF7A7A' }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Row({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <View style={styles.sumRow}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumValue, hot && { color: '#FF7A7A' }]}>{value}</Text>
    </View>
  );
}

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la = (a.latitude * Math.PI) / 180;
  const lb = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  endChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  endChipText: { color: colors.danger, fontWeight: '800', fontSize: 13 },

  // idle
  idleWrap: { padding: spacing.lg, alignItems: 'center', paddingBottom: 60 },
  idleLead: { color: colors.sub, fontSize: 14, marginBottom: spacing.lg },
  actGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  actChip: {
    width: 104,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  actChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  actEmoji: { fontSize: 26 },
  actName: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 6 },
  gpsNote: {
    color: colors.faint,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.lg,
  },
  startBtn: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  startBtnText: { color: colors.onPrimary, fontSize: 26, fontWeight: '900' },

  // running
  runWrap: { flex: 1, alignItems: 'center', paddingTop: 40 },
  bigDistance: {
    color: colors.primary,
    fontSize: 92,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -3,
    lineHeight: 100,
  },
  bigUnit: { color: colors.sub, fontSize: 14, fontWeight: '700', marginTop: -4 },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignSelf: 'stretch',
  },
  mline: { width: 1, height: 34, backgroundColor: colors.border },
  metricValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  metricLabel: { color: colors.faint, fontSize: 11, marginTop: 3 },
  gpsBadge: { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: spacing.lg },
  manualWrap: { alignItems: 'center', marginTop: spacing.lg },
  manualLabel: { color: colors.faint, fontSize: 12 },
  manualRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  manualBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  manualBtnText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  manualUnit: { color: colors.sub, fontSize: 14, fontWeight: '700' },
  controlRow: {
    flexDirection: 'row',
    gap: 22,
    marginTop: 'auto',
    marginBottom: 46,
  },
  pauseBtn: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: { backgroundColor: colors.danger },
  pausedText: {
    color: colors.warn,
    fontWeight: '800',
    marginBottom: 18,
    marginTop: -30,
  },

  // done
  doneWrap: { alignItems: 'center', padding: spacing.lg, paddingBottom: 60 },
  doneTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: spacing.md },
  summaryCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  sumLabel: { color: colors.sub, fontSize: 14 },
  sumValue: { color: colors.text, fontSize: 15, fontWeight: '800' },
  fixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.lg,
  },
  fixInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 8,
    minWidth: 90,
  },
});
