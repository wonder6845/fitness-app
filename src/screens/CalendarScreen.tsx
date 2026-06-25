import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Empty, ScreenHeader } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { bodyPartColor, colors, radius, spacing } from '../theme';
import { BodyPart, ExerciseRecord } from '../types';
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
  const { sessions } = useApp();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(dateKey(Date.now()));

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
    const result: Record<string, unknown> = { ...m };
    result[selected] = {
      ...(m[selected] ?? {}),
      selected: true,
      selectedColor: colors.primary,
    };
    return result;
  }, [sessions, selected]);

  const daySessions = useMemo(
    () =>
      sessions
        .filter((s) => dateKey(s.startedAt) === selected)
        .sort((a, b) => a.startedAt - b.startedAt),
    [sessions, selected]
  );

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
        <Text style={styles.dateTitle}>{selected.replace(/-/g, '. ')}</Text>
        {daySessions.length === 0 ? (
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
  dateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
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
