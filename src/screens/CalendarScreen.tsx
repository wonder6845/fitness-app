import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Empty, ScreenHeader } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { bodyPartColor, colors, radius, spacing } from '../theme';
import { BodyPart, ExerciseRecord, PlannedWorkout } from '../types';
import { appAlert } from '../utils/dialog';
import {
  completedSetCount,
  dateKey,
  fmtDuration,
  fmtTime,
  sessionVolume,
  totalSetCount,
} from '../utils/helpers';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

export default function CalendarScreen({ navigation }: Props) {
  const { sessions, plan, deletePlanned, getRoutine } = useApp();
  const insets = useSafeAreaInsets();
  const today = dateKey(Date.now());
  const [selected, setSelected] = useState(today);

  // 계획 완료 판정: 같은 날짜에 같은 루틴 세션이 있으면 완료
  const isPlanDone = (p: PlannedWorkout) =>
    sessions.some(
      (s) => dateKey(s.startedAt) === p.date && s.routineId === p.routineId
    );

  const marked = useMemo(() => {
    const m: Record<string, { dots: { key: string; color: string }[] }> = {};
    for (const sess of sessions) {
      const k = dateKey(sess.startedAt);
      if (!m[k]) m[k] = { dots: [] };
      for (const p of uniqueParts(sess.records)) {
        if (!m[k].dots.some((d) => d.key === p)) {
          m[k].dots.push({ key: p, color: bodyPartColor[p] });
        }
      }
    }
    // 계획된 날짜: 라임(예정) / 회색(놓침) 점
    for (const p of plan) {
      if (!m[p.date]) m[p.date] = { dots: [] };
      if (!m[p.date].dots.some((d) => d.key === 'plan')) {
        const missed = p.date < today && !isPlanDone(p);
        m[p.date].dots.push({
          key: 'plan',
          color: missed ? colors.faint : colors.primary,
        });
      }
    }
    const result: Record<string, unknown> = { ...m };
    result[selected] = {
      ...(m[selected] ?? {}),
      selected: true,
      selectedColor: colors.primary,
    };
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, plan, selected]);

  const daySessions = useMemo(
    () =>
      sessions
        .filter((s) => dateKey(s.startedAt) === selected)
        .sort((a, b) => a.startedAt - b.startedAt),
    [sessions, selected]
  );

  const dayPlans = useMemo(
    () => plan.filter((p) => p.date === selected),
    [plan, selected]
  );

  function planStatus(p: PlannedWorkout): { label: string; color: string } {
    if (isPlanDone(p)) return { label: '완료', color: colors.accent };
    if (p.date === today) return { label: '오늘 예정', color: colors.primary };
    if (p.date < today) return { label: '놓침', color: colors.warn };
    return { label: '예정', color: colors.sub };
  }

  function confirmDeletePlan(p: PlannedWorkout) {
    appAlert('계획 삭제', `${p.date.replace(/-/g, '.')} · ${p.routineName} 계획을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deletePlanned(p.id) },
    ]);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top + spacing.sm }}
    >
      <View style={{ paddingHorizontal: spacing.lg }}>
        <ScreenHeader title="운동 달력" subtitle="CALENDAR" />
      </View>
      <Calendar
        current={selected}
        onDayPress={(d: { dateString: string }) => setSelected(d.dateString)}
        markingType="multi-dot"
        markedDates={marked as never}
        theme={{
          calendarBackground: colors.bg,
          monthTextColor: colors.text,
          textMonthFontWeight: '800',
          dayTextColor: colors.text,
          textDisabledColor: colors.faint,
          todayTextColor: colors.primary,
          selectedDayTextColor: colors.onPrimary,
          selectedDayBackgroundColor: colors.primary,
          arrowColor: colors.primary,
          textSectionTitleColor: colors.sub,
        }}
      />

      <View style={styles.list}>
        <View style={styles.dateRow}>
          <Text style={styles.dateTitle}>{selected.replace(/-/g, '. ')}</Text>
          <Pressable
            style={styles.planBtn}
            onPress={() =>
              navigation.navigate(
                'PlanEdit',
                selected >= today ? { date: selected } : undefined
              )
            }
          >
            <Ionicons name="add" size={15} color={colors.onPrimary} />
            <Text style={styles.planBtnText}>계획</Text>
          </Pressable>
        </View>

        {/* 예정된 운동 계획 */}
        {dayPlans.map((p) => {
          const st = planStatus(p);
          const routineExists = !!getRoutine(p.routineId);
          const done = st.label === '완료';
          return (
            <View key={p.id} style={[styles.card, styles.planCard]}>
              <View style={styles.cardHead}>
                <View style={styles.planLabelRow}>
                  <Ionicons name="calendar-outline" size={13} color={colors.sub} />
                  <Text style={styles.time}>운동 계획</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: st.color }]}>
                  <Text style={styles.badgeText}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.routine}>{p.routineName}</Text>
              {!routineExists && (
                <Text style={styles.planGone}>루틴이 삭제되어 시작할 수 없어요.</Text>
              )}
              <View style={styles.planActions}>
                {!done && routineExists && (
                  <Pressable
                    style={styles.planStart}
                    onPress={() =>
                      navigation.navigate('Workout', { routineId: p.routineId })
                    }
                  >
                    <Ionicons name="play" size={13} color={colors.onPrimary} />
                    <Text style={styles.planStartText}>운동 시작</Text>
                  </Pressable>
                )}
                <Pressable hitSlop={8} onPress={() => confirmDeletePlan(p)}>
                  <Text style={styles.planDelete}>삭제</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {daySessions.length === 0 && dayPlans.length === 0 ? (
          <Empty text="이 날의 운동 기록이 없어요." />
        ) : (
          daySessions.map((s) => (
            <Pressable
              key={s.id}
              style={styles.card}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: s.id })}
            >
              <View style={styles.cardHead}>
                <Text style={styles.time}>{fmtTime(s.startedAt)}</Text>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        s.status === 'done' ? colors.accent : colors.warn,
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {s.status === 'done' ? '완료' : '부분 완료'}
                  </Text>
                </View>
              </View>
              <Text style={styles.routine}>{s.routineName}</Text>
              <Text style={styles.meta}>
                {sessionVolume(s.records).toLocaleString()}
                {s.unit} · {fmtDuration(s.durationSec)} ·{' '}
                {completedSetCount(s.records)}/{totalSetCount(s.records)}세트
              </Text>
              <View style={styles.parts}>
                {uniqueParts(s.records).map((p) => (
                  <View key={p} style={[styles.chip, { borderColor: bodyPartColor[p] }]}>
                    <Text style={{ color: bodyPartColor[p], fontSize: 11, fontWeight: '700' }}>
                      {p}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function uniqueParts(records: ExerciseRecord[]): BodyPart[] {
  return Array.from(new Set(records.map((r) => r.bodyPart)));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  planBtnText: { color: colors.onPrimary, fontSize: 13, fontWeight: '800' },
  planCard: { borderStyle: 'dashed', borderColor: colors.primary + '66' },
  planLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  planGone: { color: colors.warn, fontSize: 12, marginTop: 4 },
  planActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  planStart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  planStartText: { color: colors.onPrimary, fontSize: 13, fontWeight: '800' },
  planDelete: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: { color: colors.sub, fontSize: 13, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { color: '#06281c', fontSize: 11, fontWeight: '800' },
  routine: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 6 },
  meta: { color: colors.sub, fontSize: 13, marginTop: 4 },
  parts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, gap: 6 },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
});
