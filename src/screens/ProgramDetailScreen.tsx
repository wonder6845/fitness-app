import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Btn } from '../components/ui';
import { getProgram } from '../data/programs';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { bodyPartColor, colors, radius, spacing } from '../theme';
import { fmtClock } from '../utils/helpers';
import { appAlert } from '../utils/dialog';

type Props = NativeStackScreenProps<RootStackParamList, 'ProgramDetail'>;

export default function ProgramDetailScreen({ navigation, route }: Props) {
  const { addProgramRoutine } = useApp();
  const program = getProgram(route.params.programId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: program?.name ?? '프로그램' });
  }, [navigation, program]);

  if (!program) {
    return (
      <View style={styles.screen}>
        <Text style={{ color: colors.sub, padding: spacing.lg }}>
          프로그램을 찾을 수 없어요.
        </Text>
      </View>
    );
  }

  function handleAdd() {
    const routine = addProgramRoutine(program!);
    appAlert('내 루틴에 추가됨', `'${routine.name}'이(가) 내 루틴에 추가되었어요.`, [
      { text: '확인', style: 'cancel' },
      {
        text: '바로 시작',
        onPress: () => navigation.navigate('Workout', { routineId: routine.id }),
      },
    ]);
  }

  function handleStart() {
    const routine = addProgramRoutine(program!);
    navigation.navigate('Workout', { routineId: routine.id });
  }

  const totalSec = program.exercises.reduce(
    (t, e) => t + e.totalSets * e.exerciseSec + Math.max(0, e.totalSets - 1) * e.restSec,
    0
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* 그라데이션 히어로 */}
        <LinearGradient
          colors={program.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEmoji}>{program.emoji}</Text>
          <Text style={styles.heroName}>{program.name}</Text>
          <Text style={styles.heroSubtitle}>{program.subtitle}</Text>
          <View style={styles.heroChips}>
            <Chip text={`🔥 ${program.level}`} />
            <Chip text={`📅 ${program.frequency}`} />
            <Chip text={`⏱ 약 ${Math.round(totalSec / 60)}분`} />
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.desc}>{program.description}</Text>

          <Text style={styles.sectionTitle}>구성 운동 ({program.exercises.length})</Text>
          {program.exercises.map((e, i) => (
            <View key={`${e.name}-${i}`} style={styles.exRow}>
              <View style={styles.exIndex}>
                <Text style={styles.exIndexText}>{i + 1}</Text>
              </View>
              <View
                style={[styles.dot, { backgroundColor: bodyPartColor[e.bodyPart] }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{e.name}</Text>
                <Text style={styles.exMeta}>
                  {e.bodyPart} · {e.equipment} · 휴식 {fmtClock(e.restSec)}
                </Text>
              </View>
              <Text style={styles.target}>{e.targetLabel}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 하단 고정 액션 */}
      <View style={styles.bottomBar}>
        <Btn
          title="내 루틴에 추가"
          variant="secondary"
          onPress={handleAdd}
          style={{ flex: 1 }}
        />
        <Btn title="바로 시작 ▶" onPress={handleStart} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { padding: spacing.xl, paddingTop: spacing.xl, paddingBottom: 28 },
  heroEmoji: { fontSize: 52 },
  heroName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 4,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.lg },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  body: { padding: spacing.lg },
  desc: { color: colors.sub, fontSize: 14, lineHeight: 22, marginBottom: spacing.xl },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exIndexText: { color: colors.sub, fontWeight: '800', fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  exName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  exMeta: { color: colors.sub, fontSize: 12, marginTop: 2 },
  target: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  bottomBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
