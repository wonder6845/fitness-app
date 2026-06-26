import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import LineChart from '../components/LineChart';
import { Card } from '../components/ui';
import { computeProgramStats, fmtDateKo, LIFTS } from '../data/fivexfive';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { bodyPartColor, colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FiveByFiveStats'>;

export default function FiveByFiveStatsScreen({ navigation }: Props) {
  const { fivexfive: program, sessions } = useApp();
  const stats = useMemo(
    () => (program ? computeProgramStats(program, sessions) : null),
    [program, sessions]
  );

  if (!program || !stats) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.empty}>진행 중인 5×5 프로그램이 없어요.</Text>
      </ScrollView>
    );
  }
  const u = program.unit;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 요약 */}
      <Card style={styles.summary}>
        <Stat label="총 운동" value={`${stats.totalSessions}회`} />
        <Stat label="이번 주" value={`${stats.weeklyCompleted}회`} />
        <Stat label="총 볼륨" value={`${stats.totalVolume.toLocaleString()}${u}`} />
      </Card>

      {/* 운동별 통계 */}
      {stats.lifts.map((l) => {
        if (l.attempts === 0) return null;
        const color = bodyPartColor[LIFTS[l.key].bodyPart];
        return (
          <Card key={l.key} style={{ marginTop: spacing.md }}>
            <View style={styles.liftHead}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.liftName}>{l.name}</Text>
              <Text style={styles.successRate}>성공률 {l.successRate}%</Text>
            </View>
            <View style={styles.metricRow}>
              <Metric label="최고 중량" value={`${l.maxWeight}${u}`} />
              <Metric label="예상 1RM" value={`${l.est1RM}${u}`} />
              <Metric label="볼륨" value={`${l.totalVolume.toLocaleString()}${u}`} />
            </View>
            {l.series.length >= 2 ? (
              <View style={{ marginTop: spacing.sm }}>
                <LineChart data={l.series} color={color} unit={u} height={120} />
              </View>
            ) : (
              <Text style={styles.note}>회차가 쌓이면 성장 그래프가 그려집니다.</Text>
            )}
          </Card>
        );
      })}

      {/* 최근 실패 */}
      <Text style={styles.sectionTitle}>최근 실패 운동</Text>
      <Card style={{ paddingVertical: spacing.sm }}>
        {stats.recentFailures.length === 0 ? (
          <Text style={styles.note}>아직 실패한 운동이 없어요. 좋은 흐름이에요! 💪</Text>
        ) : (
          stats.recentFailures.map((f, i) => (
            <View key={i} style={styles.failRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.failName}>
                  {f.name} · {f.weight}
                  {u}
                </Text>
                {f.reason ? <Text style={styles.failReason}>원인: {f.reason}</Text> : null}
              </View>
              <Text style={styles.failDate}>{fmtDateKo(f.date)}</Text>
            </View>
          ))
        )}
      </Card>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  empty: { color: colors.sub, fontSize: 14, textAlign: 'center', marginTop: 40 },
  summary: { flexDirection: 'row', alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.sub, fontSize: 12, marginTop: 2 },
  liftHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  liftName: { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 },
  successRate: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  metricRow: { flexDirection: 'row', gap: spacing.sm },
  metricValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
  metricLabel: { color: colors.faint, fontSize: 11, marginTop: 1 },
  note: { color: colors.faint, fontSize: 12, marginTop: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
  failRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: spacing.xs },
  failName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  failReason: { color: colors.warn, fontSize: 12, marginTop: 2 },
  failDate: { color: colors.faint, fontSize: 12 },
});
