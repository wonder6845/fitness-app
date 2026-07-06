import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LineChart, { ChartPoint } from '../components/LineChart';
import { Card, Empty, Pill, ScreenHeader, SectionTitle } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { bodyPartColor, colors, radius, spacing } from '../theme';
import { BodyPart, WorkoutSession } from '../types';
import { fmtDuration } from '../utils/helpers';
import { est1RM, exerciseProgress } from '../utils/strength';

const DAY = 24 * 60 * 60 * 1000;

type Metric = '1rm' | 'weight' | 'volume';

export default function StatsScreen() {
  const { sessions } = useApp();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const stats = useMemo(() => computeStats(sessions), [sessions]);

  // 유산소 요약 (최근 30일, 완료 세트 기준)
  const cardio = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    let sec = 0;
    let km = 0;
    let count = 0;
    for (const s of sessions) {
      if (s.startedAt < cutoff) continue;
      for (const r of s.records) {
        if (r.bodyPart !== '유산소') continue;
        let any = false;
        for (const set of r.sets) {
          if (!set.completed) continue;
          any = true;
          sec += set.durationSec ?? 0;
          km += set.distanceKm ?? 0;
        }
        if (any) count++;
      }
    }
    return { sec, km: Math.round(km * 10) / 10, count };
  }, [sessions]);

  // 운동별 진행 그래프용: 데이터가 있는 운동 목록
  const exerciseList = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of sessions) {
      for (const r of s.records) {
        if (r.sets.some((x) => x.completed)) seen.set(r.exerciseId, r.exerciseName);
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [sessions]);

  const [exId, setExId] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('1rm');
  const selectedExId = exId ?? exerciseList[0]?.id ?? null;

  const chartData: ChartPoint[] = useMemo(() => {
    if (!selectedExId) return [];
    return exerciseProgress(selectedExId, sessions).map((p) => ({
      ts: p.ts,
      value: metric === '1rm' ? p.max1RM : metric === 'weight' ? p.maxWeight : p.volume,
    }));
  }, [selectedExId, metric, sessions]);

  const unit = sessions[0]?.unit ?? 'kg';

  const Header = (
    <View style={{ paddingTop: insets.top + spacing.sm }}>
      <ScreenHeader title="통계" subtitle="STATISTICS" />
    </View>
  );

  const bodyCard = (
    <Card style={styles.bodyEntry} onPress={() => navigation.navigate('Body')}>
      <View style={styles.bodyIcon}>
        <Ionicons name="body-outline" size={20} color={colors.onPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bodyTitle}>인바디 기록</Text>
        <Text style={styles.bodySub}>체중 · 체지방 · 골격근량 · BMI 추적</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.faint} />
    </Card>
  );

  if (sessions.length === 0) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
        {Header}
        {bodyCard}
        <Empty icon="stats-chart-outline" text={'아직 운동 기록이 없어요.\n운동을 완료하면 통계가 쌓입니다.'} />
      </ScrollView>
    );
  }

  const maxPart = Math.max(1, ...stats.partDist.map((p) => p.count));
  const maxWeek = Math.max(1, ...stats.weekly.map((w) => w.count));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {Header}

      {/* 신체 기록 진입 */}
      {bodyCard}

      {/* 요약 */}
      <SectionTitle>이번 주</SectionTitle>
      <Card style={{ marginBottom: spacing.xl }}>
        <View style={styles.row}>
          <Stat value={`${stats.weekCount}`} label="운동 횟수" />
          <View style={styles.vline} />
          <Stat value={fmtDuration(stats.weekDuration)} label="총 운동 시간" />
          <View style={styles.vline} />
          <Stat value={`${stats.monthCount}`} label="이번 달 횟수" />
        </View>
      </Card>

      {/* 주간 빈도 */}
      <SectionTitle>최근 8주 운동 횟수</SectionTitle>
      <Card style={{ marginBottom: spacing.xl }}>
        <View style={styles.barChart}>
          {stats.weekly.map((w, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barValue}>{w.count || ''}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${(w.count / maxWeek) * 100}%`,
                      backgroundColor: i === stats.weekly.length - 1 ? colors.primary : colors.primaryDark,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{w.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* 부위별 분포 */}
      <SectionTitle>부위별 세트 (최근 30일)</SectionTitle>
      <Card style={{ marginBottom: spacing.xl }}>
        {stats.partDist.length === 0 ? (
          <Text style={{ color: colors.sub }}>최근 30일 기록이 없어요.</Text>
        ) : (
          stats.partDist.map((p) => (
            <View key={p.part} style={styles.distRow}>
              <Text style={styles.distLabel}>{p.part}</Text>
              <View style={styles.distTrack}>
                <View
                  style={[
                    styles.distFill,
                    {
                      width: `${(p.count / maxPart) * 100}%`,
                      backgroundColor: bodyPartColor[p.part],
                    },
                  ]}
                />
              </View>
              <Text style={styles.distCount}>{p.count}세트</Text>
            </View>
          ))
        )}
      </Card>

      {/* 유산소 요약 */}
      {cardio.count > 0 && (
        <>
          <SectionTitle>유산소 (최근 30일)</SectionTitle>
          <Card style={{ marginBottom: spacing.xl }}>
            <View style={styles.row}>
              <Stat value={`${cardio.count}회`} label="유산소 운동" />
              <View style={styles.vline} />
              <Stat value={fmtDuration(cardio.sec)} label="총 시간" />
              <View style={styles.vline} />
              <Stat value={cardio.km > 0 ? `${cardio.km}km` : '-'} label="총 거리" />
            </View>
          </Card>
        </>
      )}

      {/* 운동별 진행 그래프 */}
      {exerciseList.length > 0 && (
        <>
          <SectionTitle>운동별 진행</SectionTitle>
          <Card style={{ marginBottom: spacing.xl }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.sm }}
            >
              {exerciseList.map((e) => (
                <Pill
                  key={e.id}
                  label={e.name}
                  selected={selectedExId === e.id}
                  onPress={() => setExId(e.id)}
                />
              ))}
            </ScrollView>
            <View style={styles.metricRow}>
              {(['1rm', 'weight', 'volume'] as Metric[]).map((m) => (
                <Pill
                  key={m}
                  label={m === '1rm' ? '추정 1RM' : m === 'weight' ? '최고 중량' : '볼륨'}
                  color={colors.accent}
                  selected={metric === m}
                  onPress={() => setMetric(m)}
                />
              ))}
            </View>
            <LineChart
              data={chartData}
              color={colors.accent}
              unit={metric === 'volume' ? unit : unit}
              emptyText="이 운동의 기록이 2회 이상 쌓이면 그래프가 보여요"
            />
          </Card>
        </>
      )}

      {/* 개인 기록 */}
      <SectionTitle>운동별 최고 기록</SectionTitle>
      <Card>
        {stats.prs.length === 0 ? (
          <Text style={{ color: colors.sub }}>완료된 세트가 아직 없어요.</Text>
        ) : (
          stats.prs.map((pr, i) => (
            <View key={pr.exerciseId}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.prRow}>
                <Text style={styles.prName}>{pr.name}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.prValue}>
                    {pr.weight}
                    {pr.unit} × {pr.reps}
                  </Text>
                  {pr.e1rm > 0 && (
                    <Text style={styles.prSub}>추정 1RM {pr.e1rm}{pr.unit}</Text>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

interface Stats {
  weekCount: number;
  weekDuration: number;
  monthCount: number;
  weekly: { label: string; count: number }[];
  partDist: { part: BodyPart; count: number }[];
  prs: {
    exerciseId: string;
    name: string;
    weight: number;
    reps: number;
    e1rm: number;
    unit: string;
  }[];
}

function computeStats(sessions: WorkoutSession[]): Stats {
  const now = new Date();
  const todayMid = new Date(now);
  todayMid.setHours(0, 0, 0, 0);

  // 이번 주(월요일 시작)
  const dow = (now.getDay() + 6) % 7;
  const weekStart = new Date(todayMid);
  weekStart.setDate(todayMid.getDate() - dow);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let weekCount = 0;
  let weekDuration = 0;
  let monthCount = 0;
  for (const s of sessions) {
    if (s.startedAt >= weekStart.getTime()) {
      weekCount += 1;
      weekDuration += s.durationSec;
    }
    if (s.startedAt >= monthStart) monthCount += 1;
  }

  // 최근 8주 빈도
  const weekly: { label: string; count: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = weekStart.getTime() - w * 7 * DAY;
    const end = start + 7 * DAY;
    const count = sessions.filter(
      (s) => s.startedAt >= start && s.startedAt < end
    ).length;
    weekly.push({ label: w === 0 ? '이번' : `${w}주전`, count });
  }

  // 부위별 세트 (최근 30일, 완료 세트 기준)
  const since = Date.now() - 30 * DAY;
  const partMap = new Map<BodyPart, number>();
  for (const s of sessions) {
    if (s.startedAt < since) continue;
    for (const rec of s.records) {
      const done = rec.sets.filter((st) => st.completed).length;
      if (done > 0) partMap.set(rec.bodyPart, (partMap.get(rec.bodyPart) ?? 0) + done);
    }
  }
  const partDist = Array.from(partMap.entries())
    .map(([part, count]) => ({ part, count }))
    .sort((a, b) => b.count - a.count);

  // 운동별 최고 무게 + 추정 1RM (PR)
  const prMap = new Map<Stats['prs'][number]['exerciseId'], Stats['prs'][number]>();
  for (const s of sessions) {
    for (const rec of s.records) {
      for (const st of rec.sets) {
        if (!st.completed || st.weight <= 0) continue;
        const cur = prMap.get(rec.exerciseId);
        const e = est1RM(st.weight, st.reps);
        if (!cur) {
          prMap.set(rec.exerciseId, {
            exerciseId: rec.exerciseId,
            name: rec.exerciseName,
            weight: st.weight,
            reps: st.reps,
            e1rm: e,
            unit: s.unit,
          });
        } else {
          if (st.weight > cur.weight) {
            cur.weight = st.weight;
            cur.reps = st.reps;
            cur.unit = s.unit;
          }
          if (e > cur.e1rm) cur.e1rm = e;
        }
      }
    }
  }
  const prs = Array.from(prMap.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);

  return { weekCount, weekDuration, monthCount, weekly, partDist, prs };
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48 },
  row: { flexDirection: 'row', alignItems: 'center' },
  vline: { width: 1, height: 30, backgroundColor: colors.border },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.sub, fontSize: 12, marginTop: 4, textAlign: 'center' },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    justifyContent: 'space-between',
  },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { color: colors.sub, fontSize: 11, marginBottom: 2, height: 14 },
  barTrack: {
    width: 16,
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: radius.sm },
  barLabel: { color: colors.faint, fontSize: 10, marginTop: 4 },
  distRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  distLabel: { color: colors.text, width: 48, fontSize: 13, fontWeight: '600' },
  distTrack: {
    flex: 1,
    height: 16,
    backgroundColor: colors.inputBg,
    borderRadius: radius.sm,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  distFill: { height: '100%', borderRadius: radius.sm },
  distCount: { color: colors.sub, fontSize: 12, width: 52, textAlign: 'right' },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  prName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  prValue: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  prSub: { color: colors.sub, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border },
  bodyEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  bodyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  bodySub: { color: colors.sub, fontSize: 13, marginTop: 2 },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
});
