import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PROGRAMS, WorkoutProgram } from '../data/programs';
import { RootStackParamList } from '../navigation';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Programs'>;

export default function ProgramsScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        검증된 운동 프로그램을 골라 바로 내 루틴으로 가져오세요.
      </Text>
      {PROGRAMS.map((p) => (
        <ProgramCard
          key={p.id}
          program={p}
          onPress={() => navigation.navigate('ProgramDetail', { programId: p.id })}
        />
      ))}
    </ScrollView>
  );
}

export function ProgramCard({
  program,
  onPress,
  wide,
}: {
  program: WorkoutProgram;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
    >
      <LinearGradient
        colors={program.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, wide && { width: 260, marginRight: spacing.md }]}
      >
        <View style={styles.cardTop}>
          <Text style={styles.emoji}>{program.emoji}</Text>
          <View style={styles.levelChip}>
            <Text style={styles.levelText}>{program.level}</Text>
          </View>
        </View>
        <Text style={styles.name}>{program.name}</Text>
        <Text style={styles.subtitle}>{program.subtitle}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>🏋️ 운동 {program.exercises.length}개</Text>
          <Text style={styles.meta}>📅 {program.frequency}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  lead: { color: colors.sub, fontSize: 14, marginBottom: spacing.lg, lineHeight: 20 },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 150,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emoji: { fontSize: 36 },
  levelChip: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  levelText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: spacing.md,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 4,
  },
  subtitle: { color: 'rgba(255,255,255,0.92)', fontSize: 14, marginTop: 2, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  meta: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '700' },
});
