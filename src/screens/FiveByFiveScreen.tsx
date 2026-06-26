import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Btn, Card } from '../components/ui';
import {
  buildRoutineExercises,
  buildSchedule,
  computeProgramState,
  fmtDateKo,
  LIFTS,
  nextWorkoutDate,
  programAlerts,
  recommendationText,
  routineLabel,
  routineLifts,
  ScheduleStatus,
  sessionRoutineTag,
  todayYmd,
  weekdayKo,
} from '../data/fivexfive';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { colors, radius, spacing } from '../theme';
import { appAlert } from '../utils/dialog';

type Props = NativeStackScreenProps<RootStackParamList, 'FiveByFive'>;

const STATUS: Record<ScheduleStatus, { label: string; color: string }> = {
  done: { label: '완료', color: colors.primary },
  today: { label: '오늘', color: colors.accent },
  upcoming: { label: '예정', color: colors.faint },
  missed: { label: '놓침', color: colors.danger },
  skipped: { label: '건너뜀', color: colors.warn },
};

export default function FiveByFiveScreen({ navigation }: Props) {
  const { fivexfive: program, sessions, saveFivexFive, clearFivexFive } = useApp();

  const derived = useMemo(() => {
    if (!program) return null;
    const state = computeProgramState(program, sessions);
    const schedule = buildSchedule(program, sessions, state);
    return {
      state,
      schedule,
      next: nextWorkoutDate(schedule),
      alerts: programAlerts(program, state, schedule),
    };
  }, [program, sessions]);

  // ── 프로그램 미설정 ──
  if (!program || !derived) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.emptyTitle}>🏋️ StrongLifts 5×5</Text>
          <Text style={styles.emptyText}>
            주 3회, Workout A/B를 번갈아 진행하며 매 운동마다 중량을 올리는 가장 유명한 근력
            프로그램입니다. 자동 일정·중량 추천·deload까지 앱이 관리해줘요.
          </Text>
          <Btn
            title="5×5 프로그램 시작하기"
            icon="barbell"
            onPress={() => navigation.navigate('FiveByFiveSetup')}
            style={{ marginTop: spacing.lg }}
          />
        </Card>
      </ScrollView>
    );
  }

  const { state, schedule, next, alerts } = derived;
  const ALERT_COLOR = { good: colors.primary, info: colors.accent, warn: colors.warn };
  const today = todayYmd();
  const doneToday = schedule.some((it) => it.date === today && it.status === 'done');
  const lifts = routineLifts(state.nextRoutine);

  function start() {
    if (!program) return;
    const exs = buildRoutineExercises(program, state.nextRoutine, state);
    navigation.navigate('Workout', {
      exercises: exs,
      title: `${program.name} · ${routineLabel(state.nextRoutine)}`,
      programId: program.id,
      programRoutine: sessionRoutineTag(state.nextRoutine),
    });
  }
  function skip() {
    if (!program) return;
    const target = next?.date ?? today;
    appAlert('건너뛰기', `${fmtDateKo(target)} 운동을 건너뛸까요?\n루틴 순서(${routineLabel(state.nextRoutine)})는 그대로 유지됩니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '건너뜀',
        onPress: () => saveFivexFive({ ...program, skips: [...program.skips, target] }),
      },
    ]);
  }
  function endProgram() {
    appAlert('프로그램 종료', '5×5 프로그램을 종료할까요?\n지금까지 기록된 운동 세션은 그대로 남습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '종료', style: 'destructive', onPress: clearFivexFive },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 앱 내 알림 (예정일·회복·미실시·deload 등) */}
      {alerts.map((a, i) => (
        <View
          key={i}
          style={[
            styles.banner,
            { backgroundColor: ALERT_COLOR[a.tone] + '1F', borderColor: ALERT_COLOR[a.tone] + '59' },
          ]}
        >
          <Ionicons
            name={a.tone === 'warn' ? 'alert-circle-outline' : a.tone === 'good' ? 'flame-outline' : 'information-circle-outline'}
            size={18}
            color={ALERT_COLOR[a.tone]}
          />
          <Text style={styles.bannerText}>{a.text}</Text>
        </View>
      ))}

      {/* 오늘의 운동 */}
      <Card>
        <View style={styles.todayHead}>
          <Text style={styles.todayLabel}>다음 운동</Text>
          <View style={[styles.routineChip, { backgroundColor: colors.accent }]}>
            <Text style={styles.routineChipText}>{routineLabel(state.nextRoutine)}</Text>
          </View>
        </View>

        {lifts.map((key) => {
          const L = LIFTS[key];
          const st = state.lifts[key];
          const note =
            st.lastResult || st.deloadPending ? recommendationText(key, st, program.unit) : null;
          return (
            <View key={key} style={styles.liftRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.liftName}>{L.name}</Text>
                {note && (
                  <Text style={[styles.liftNote, st.deloadPending && { color: colors.warn }, st.lastResult === 'success' && { color: colors.primary }]}>
                    {note}
                  </Text>
                )}
                <Pressable
                  hitSlop={6}
                  onPress={() =>
                    appAlert(
                      `${L.name} 대체 운동`,
                      '기구가 없거나 통증이 있을 때 이렇게 대체할 수 있어요:\n\n• ' + L.alts.join('\n• ')
                    )
                  }
                >
                  <Text style={styles.altLink}>대체 운동 보기</Text>
                </Pressable>
              </View>
              <Text style={styles.liftSpec}>{L.sets}×{L.reps}</Text>
              <Text style={styles.liftWeight}>
                {st.weight}
                {program.unit}
              </Text>
            </View>
          );
        })}

        {doneToday ? (
          <View style={styles.doneBox}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={styles.doneText}>오늘 운동 완료!</Text>
          </View>
        ) : (
          <>
            <Btn title="운동 시작" icon="play" onPress={start} style={{ marginTop: spacing.md }} />
            <Pressable onPress={skip} style={styles.skipBtn}>
              <Text style={styles.skipText}>이번 운동 건너뛰기</Text>
            </Pressable>
          </>
        )}
      </Card>

      {next && (
        <Text style={styles.nextLine}>
          📅 다음 추천 운동일: {fmtDateKo(next.date)} · {routineLabel(next.routine ?? state.nextRoutine)}
        </Text>
      )}

      <Btn
        title="진행 통계 보기"
        variant="secondary"
        icon="stats-chart"
        onPress={() => navigation.navigate('FiveByFiveStats')}
        style={{ marginTop: spacing.md }}
      />

      {/* 일정 */}
      <Text style={styles.sectionTitle}>운동 일정</Text>
      <Card style={{ paddingVertical: spacing.sm }}>
        {schedule.map((it) => {
          const s = STATUS[it.status];
          const isToday = it.date === today;
          return (
            <View key={it.date} style={[styles.schedRow, isToday && styles.schedToday]}>
              <Text style={styles.schedDate}>
                {fmtDateKo(it.date)}
              </Text>
              <Text style={styles.schedRoutine}>
                {it.routine ? routineLabel(it.routine).replace('Workout ', 'W') : '—'}
              </Text>
              <View style={[styles.statusChip, { borderColor: s.color }]}>
                <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      {/* 진행 요약 */}
      <Text style={styles.summaryLine}>
        총 {state.completedCount}회 완료 · 시작 {weekdayKo(program.startDate)}요일 기준
      </Text>

      <View style={styles.actions}>
        <Btn title="프로그램 설정" variant="secondary" small icon="settings-outline" onPress={() => navigation.navigate('FiveByFiveSetup', { edit: true })} style={{ flex: 1 }} />
        <Btn title="프로그램 종료" variant="ghost" small onPress={endProgram} style={{ flex: 1 }} />
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: spacing.sm },
  emptyText: { color: colors.sub, fontSize: 14, lineHeight: 21 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,176,32,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,176,32,0.35)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: { color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 },

  todayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  todayLabel: { color: colors.sub, fontSize: 13, fontWeight: '700' },
  routineChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  routineChipText: { color: colors.onAccent, fontSize: 13, fontWeight: '900' },

  liftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  liftName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  liftNote: { color: colors.sub, fontSize: 12, marginTop: 2 },
  altLink: { color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 3 },
  liftSpec: { color: colors.faint, fontSize: 13, fontWeight: '700' },
  liftWeight: { color: colors.text, fontSize: 18, fontWeight: '900', minWidth: 64, textAlign: 'right' },

  doneBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.md, paddingVertical: spacing.md },
  doneText: { color: colors.primary, fontSize: 16, fontWeight: '800' },

  skipBtn: { alignItems: 'center', paddingVertical: spacing.md },
  skipText: { color: colors.faint, fontSize: 13, fontWeight: '600' },

  nextLine: { color: colors.sub, fontSize: 13, fontWeight: '600', marginTop: spacing.md },

  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
  schedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: spacing.xs,
  },
  schedToday: { backgroundColor: 'rgba(45,212,191,0.08)', borderRadius: radius.sm },
  schedDate: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  schedRoutine: { color: colors.sub, fontSize: 13, fontWeight: '800', width: 34 },
  statusChip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, minWidth: 52, alignItems: 'center' },
  statusText: { fontSize: 12, fontWeight: '800' },

  summaryLine: { color: colors.faint, fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
});
