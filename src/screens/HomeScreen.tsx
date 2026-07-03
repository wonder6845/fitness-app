import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Btn,
  Card,
  Empty,
  ProgressRing,
  ScreenHeader,
  SectionHeader,
} from '../components/ui';
import { PROGRAMS } from '../data/programs';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { bodyPartColor, colors, font, radius, spacing } from '../theme';
import {
  dateKey,
  fmtDateKorean,
  fmtDuration,
  sessionVolume,
} from '../utils/helpers';
import { draftToSession } from '../workout/session';
import { ProgramCard } from './ProgramsScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

const WEEK_GOAL = 4;

export default function HomeScreen({ navigation }: Props) {
  const { routines, sessions, draft, clearDraft, addSession, plan, getRoutine } =
    useApp();
  const insets = useSafeAreaInsets();

  const now = Date.now();
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return '좋은 아침이에요';
    if (h < 18) return '오늘도 화이팅';
    return '오늘도 고생했어요';
  }, []);

  const { weekCount, monthCount, streak } = useMemo(
    () => computeStats(sessions),
    [sessions]
  );

  const todayKey = dateKey(now);
  const todaySessions = sessions.filter((s) => dateKey(s.startedAt) === todayKey);
  const weekProgress = Math.min(weekCount / WEEK_GOAL, 1);

  // 오늘 예정된 운동 계획 (아직 완료하지 않은 것)
  const todayPlans = plan.filter(
    (p) =>
      p.date === todayKey &&
      !sessions.some(
        (s) => dateKey(s.startedAt) === p.date && s.routineId === p.routineId
      )
  );

  function handleSaveDraft() {
    if (!draft) return;
    addSession(draftToSession(draft, Date.now()));
    clearDraft();
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        subtitle={fmtDateKorean(now)}
        title={greeting}
        right={
          <View style={styles.streak}>
            <Ionicons name="flame" size={15} color={colors.warn} />
            <Text style={styles.streakText}>{streak}일</Text>
          </View>
        }
      />

      {/* 주간 활동 히어로 */}
      <Card style={styles.hero}>
        <ProgressRing size={116} stroke={11} progress={weekProgress} color={colors.primary}>
          <Text style={styles.ringValue}>{weekCount}</Text>
          <Text style={styles.ringUnit}>/ {WEEK_GOAL}</Text>
        </ProgressRing>
        <View style={styles.heroRight}>
          <Text style={styles.heroLabel}>이번 주 운동</Text>
          <Text style={styles.heroBig}>
            {weekCount >= WEEK_GOAL ? '목표 달성! 🎉' : `${WEEK_GOAL - weekCount}회 남았어요`}
          </Text>
          <View style={styles.heroStats}>
            <MiniStat icon="calendar-outline" value={`${monthCount}`} label="이번 달" />
            <View style={styles.heroDivider} />
            <MiniStat icon="albums-outline" value={`${sessions.length}`} label="전체 기록" />
          </View>
        </View>
      </Card>

      {/* 진행 중 운동 복구 */}
      {draft && (
        <Card style={styles.draftCard}>
          <View style={styles.draftHead}>
            <View style={styles.draftIcon}>
              <Ionicons name="play" size={16} color={colors.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.draftTitle}>진행 중이던 운동</Text>
              <Text style={styles.draftSub}>{draft.routineName}</Text>
            </View>
          </View>
          <View style={styles.draftBtns}>
            <Btn
              title="이어서 하기"
              icon="play"
              small
              onPress={() => navigation.navigate('Workout', { resume: true })}
              style={{ flex: 1 }}
            />
            <Btn title="저장" small variant="secondary" onPress={handleSaveDraft} />
            <Btn title="삭제" small variant="ghost" onPress={clearDraft} />
          </View>
        </Card>
      )}

      {/* 오늘의 계획 */}
      {todayPlans.length > 0 && (
        <Card style={styles.planCard}>
          <View style={styles.draftHead}>
            <View style={styles.planIcon}>
              <Ionicons name="calendar" size={16} color={colors.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.draftTitle}>오늘의 계획</Text>
              <Text style={styles.draftSub}>
                {todayPlans.length}개의 운동이 예정되어 있어요
              </Text>
            </View>
          </View>
          {todayPlans.map((p) => (
            <View key={p.id} style={styles.planRow}>
              <Text style={styles.planName}>{p.routineName}</Text>
              {getRoutine(p.routineId) ? (
                <Btn
                  title="시작"
                  icon="play"
                  small
                  onPress={() =>
                    navigation.navigate('Workout', { routineId: p.routineId })
                  }
                />
              ) : (
                <Text style={styles.planGone}>루틴 삭제됨</Text>
              )}
            </View>
          ))}
        </Card>
      )}

      {/* 운동 프로그램 */}
      <SectionHeader
        title="운동 프로그램"
        actionLabel="전체 보기"
        onAction={() => navigation.navigate('Programs')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
      >
        {PROGRAMS.map((p) => (
          <ProgramCard
            key={p.id}
            program={p}
            wide
            onPress={() =>
              p.id === 'prog-5x5'
                ? navigation.navigate('FiveByFive')
                : navigation.navigate('ProgramDetail', { programId: p.id })
            }
          />
        ))}
      </ScrollView>

      {/* 빠른 시작 */}
      <SectionHeader title="빠른 시작" />
      {routines.length === 0 ? (
        <Card>
          <Empty
            icon="add-circle-outline"
            text={'아직 루틴이 없어요.\n루틴을 만들고 바로 운동을 시작해보세요.'}
          />
          <Btn title="루틴 만들기" icon="add" onPress={() => navigation.navigate('RoutineEdit')} />
        </Card>
      ) : (
        routines.slice(0, 4).map((r) => (
          <Card key={r.id} style={styles.routineRow} onPress={() => navigation.navigate('RoutineEdit', { routineId: r.id })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routineName}>{r.name}</Text>
              <View style={styles.routineMeta}>
                <Ionicons name="barbell-outline" size={13} color={colors.sub} />
                <Text style={styles.routineMetaText}>운동 {r.exercises.length}개</Text>
                <Ionicons name="time-outline" size={13} color={colors.sub} style={{ marginLeft: 8 }} />
                <Text style={styles.routineMetaText}>약 {fmtDuration(estimateSec(r.exercises))}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Workout', { routineId: r.id })}
              style={({ pressed }) => [styles.playBtn, pressed && { transform: [{ scale: 0.92 }] }]}
            >
              <Ionicons name="play" size={20} color={colors.onPrimary} />
            </Pressable>
          </Card>
        ))
      )}

      {/* 오늘의 운동 */}
      {todaySessions.length > 0 && (
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="오늘의 운동" />
          {todaySessions.map((s) => (
            <Card
              key={s.id}
              style={styles.todayRow}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: s.id })}
            >
              <View style={[styles.todayDot, { backgroundColor: s.status === 'done' ? colors.accent : colors.warn }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routineName}>{s.routineName}</Text>
                <Text style={styles.routineMetaText}>
                  {sessionVolume(s.records).toLocaleString()}{s.unit} · {fmtDuration(s.durationSec)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.faint} />
            </Card>
          ))}
        </View>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
}) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Ionicons name={icon} size={16} color={colors.sub} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
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

function computeStats(sessions: { startedAt: number }[]) {
  const now = new Date();
  const mid = new Date(now);
  mid.setHours(0, 0, 0, 0);
  const dow = (now.getDay() + 6) % 7;
  const weekStart = new Date(mid);
  weekStart.setDate(mid.getDate() - dow);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let weekCount = 0;
  let monthCount = 0;
  const days = new Set<string>();
  for (const s of sessions) {
    if (s.startedAt >= weekStart.getTime()) weekCount += 1;
    if (s.startedAt >= monthStart) monthCount += 1;
    days.add(dateKey(s.startedAt));
  }
  // 연속 운동일(오늘 또는 어제부터 역순)
  let streak = 0;
  const cursor = new Date(mid);
  if (!days.has(dateKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dateKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { weekCount, monthCount, streak };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  streakText: { color: colors.text, fontWeight: '800', fontSize: 13 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  ringValue: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  ringUnit: { color: colors.sub, fontSize: 13, fontWeight: '700', marginTop: -2 },
  heroRight: { flex: 1 },
  heroLabel: { ...font.overline },
  heroBig: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginTop: 4 },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  heroDivider: { width: 1, height: 30, backgroundColor: colors.border },
  miniValue: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 3 },
  miniLabel: { color: colors.sub, fontSize: 11, marginTop: 1 },

  draftCard: { marginBottom: spacing.lg, borderColor: colors.primary, backgroundColor: '#171c12' },
  draftHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  draftIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  draftTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  draftSub: { color: colors.sub, fontSize: 13, marginTop: 1 },
  draftBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  planCard: { marginBottom: spacing.lg, borderColor: colors.accent, backgroundColor: '#101c19' },
  planIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  planName: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  planGone: { color: colors.faint, fontSize: 12 },

  carousel: { marginHorizontal: -spacing.lg, marginBottom: spacing.xl },

  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  routineName: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  routineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  routineMetaText: { color: colors.sub, fontSize: 13, fontWeight: '500' },
  playBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingLeft: 2,
  },
  todayRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md },
  todayDot: { width: 10, height: 10, borderRadius: 5 },
});
