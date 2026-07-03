import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Btn, Card, Empty } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { bodyPartColor, colors, radius, spacing } from '../theme';
import { Routine } from '../types';
import { appAlert } from '../utils/dialog';
import { dateKey, fmtDuration } from '../utils/helpers';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanEdit'>;

/**
 * 운동 계획 짜기 — 루틴을 고르고 달력에서 날짜(여러 개)를 선택해 일정 생성.
 */
export default function PlanEditScreen({ navigation, route }: Props) {
  const { routines, plan, addPlanned } = useApp();
  const today = dateKey(Date.now());

  const [routineId, setRoutineId] = useState<string | null>(
    routines[0]?.id ?? null
  );
  const [dates, setDates] = useState<string[]>(
    route.params?.date && route.params.date >= today ? [route.params.date] : []
  );

  const routine = routines.find((r) => r.id === routineId) ?? null;

  // 이미 계획된 날짜(선택 루틴 기준) — 달력에 점으로 표시
  const plannedDates = useMemo(() => {
    const s = new Set<string>();
    for (const p of plan) {
      if (!routineId || p.routineId === routineId) s.add(p.date);
    }
    return s;
  }, [plan, routineId]);

  const marked = useMemo(() => {
    const m: Record<string, unknown> = {};
    for (const d of plannedDates) {
      m[d] = { marked: true, dotColor: colors.faint };
    }
    for (const d of dates) {
      m[d] = {
        ...(m[d] ?? {}),
        selected: true,
        selectedColor: colors.primary,
      };
    }
    return m;
  }, [plannedDates, dates]);

  function toggleDate(d: string) {
    if (d < today) return; // 과거 날짜엔 계획 불가
    setDates((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  function save() {
    if (!routine) {
      appAlert('루틴 없음', '계획할 루틴을 먼저 선택해주세요.');
      return;
    }
    if (dates.length === 0) {
      appAlert('날짜 없음', '달력에서 운동할 날짜를 1개 이상 선택해주세요.');
      return;
    }
    addPlanned(
      dates.map((date) => ({
        date,
        routineId: routine.id,
        routineName: routine.name,
      }))
    );
    navigation.goBack();
  }

  if (routines.length === 0) {
    return (
      <View style={[styles.screen, { padding: spacing.lg }]}>
        <Empty
          icon="barbell-outline"
          text={'계획할 루틴이 아직 없어요.\n먼저 루틴을 만들어주세요.'}
        />
        <Btn
          title="루틴 만들기"
          icon="add"
          onPress={() => navigation.replace('RoutineEdit', undefined)}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 1. 루틴 선택 */}
        <Text style={styles.step}>1. 어떤 루틴을 할까요?</Text>
        {routines.map((r) => (
          <RoutineRow
            key={r.id}
            routine={r}
            selected={r.id === routineId}
            onPress={() => setRoutineId(r.id)}
          />
        ))}

        {/* 2. 날짜 선택 */}
        <Text style={[styles.step, { marginTop: spacing.lg }]}>
          2. 언제 할까요? (여러 날 선택 가능)
        </Text>
        <Card style={{ paddingVertical: spacing.sm, paddingHorizontal: 0 }}>
          <Calendar
            current={route.params?.date ?? today}
            minDate={today}
            onDayPress={(d: { dateString: string }) => toggleDate(d.dateString)}
            markedDates={marked as never}
            theme={{
              calendarBackground: 'transparent',
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
        </Card>
        {dates.length > 0 && (
          <Text style={styles.summary}>
            선택한 날짜 {dates.length}일 ·{' '}
            {dates.map((d) => d.slice(5).replace('-', '/')).join(', ')}
          </Text>
        )}
        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Btn
          title={
            dates.length > 0
              ? `${dates.length}일 계획 저장`
              : '계획 저장'
          }
          icon="checkmark"
          onPress={save}
        />
      </View>
    </View>
  );
}

function estimateSec(
  exercises: { totalSets: number; exerciseSec: number; restSec: number }[]
): number {
  return exercises.reduce(
    (t, e) => t + e.totalSets * e.exerciseSec + Math.max(0, e.totalSets - 1) * e.restSec,
    0
  );
}

function RoutineRow({
  routine,
  selected,
  onPress,
}: {
  routine: Routine;
  selected: boolean;
  onPress: () => void;
}) {
  const parts = Array.from(new Set(routine.exercises.map((e) => e.bodyPart)));
  return (
    <Pressable
      onPress={onPress}
      style={[styles.routineRow, selected && styles.routineRowOn]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.routineName}>{routine.name}</Text>
        <Text style={styles.routineMeta}>
          운동 {routine.exercises.length}개 · 약{' '}
          {fmtDuration(estimateSec(routine.exercises))}
        </Text>
        <View style={styles.parts}>
          {parts.map((p) => (
            <View key={p} style={[styles.chip, { borderColor: bodyPartColor[p] }]}>
              <Text style={{ color: bodyPartColor[p], fontSize: 10, fontWeight: '700' }}>
                {p}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  step: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  routineRowOn: { borderColor: colors.primary, backgroundColor: '#1b2413' },
  routineName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  routineMeta: { color: colors.sub, fontSize: 12, marginTop: 2 },
  parts: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  summary: { color: colors.sub, fontSize: 12, marginTop: spacing.sm, lineHeight: 18 },
  bottomBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
});
