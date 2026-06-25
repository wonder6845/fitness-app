import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appAlert } from '../utils/dialog';
import { Btn, Empty, ScreenHeader } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { bodyPartColor, colors, radius, spacing } from '../theme';
import { Routine } from '../types';
import { fmtDuration } from '../utils/helpers';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

export default function RoutinesScreen({ navigation }: Props) {
  const { routines, deleteRoutine } = useApp();
  const insets = useSafeAreaInsets();

  function confirmDelete(r: Routine) {
    appAlert('루틴 삭제', `'${r.name}'을(를) 삭제할까요?\n과거 운동 기록은 유지됩니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteRoutine(r.id) },
    ]);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <ScreenHeader title="내 루틴" subtitle="MY ROUTINES" />
      </View>
      <FlatList
        data={routines}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Pressable
            onPress={() => navigation.navigate('Programs')}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={['#6a11cb', '#2575fc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.programBanner}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>🔥 운동 프로그램 둘러보기</Text>
                <Text style={styles.bannerSub}>
                  사이타마 훈련법 · 5×5 · PPL 분할 등
                </Text>
              </View>
              <Text style={styles.bannerArrow}>›</Text>
            </LinearGradient>
          </Pressable>
        }
        ListEmptyComponent={
          <Empty text={'아직 만든 루틴이 없어요.\n아래 버튼으로 첫 루틴을 만들어보세요.'} />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('RoutineEdit', { routineId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.name}</Text>
              <Pressable hitSlop={10} onPress={() => confirmDelete(item)}>
                <Text style={{ color: colors.danger, fontWeight: '600' }}>삭제</Text>
              </Pressable>
            </View>
            <Text style={styles.sub}>
              운동 {item.exercises.length}개 · 예상{' '}
              {fmtDuration(estimateSec(item))}
            </Text>
            {/* 부위 칩 */}
            <View style={styles.parts}>
              {uniqueParts(item).map((p) => (
                <View
                  key={p}
                  style={[styles.partChip, { borderColor: bodyPartColor[p] }]}
                >
                  <Text style={{ color: bodyPartColor[p], fontSize: 11, fontWeight: '700' }}>
                    {p}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.cardActions}>
              <Btn
                title="▶ 운동 시작"
                small
                variant="accent"
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('Workout', { routineId: item.id })}
              />
              <Btn
                title="편집"
                small
                variant="secondary"
                onPress={() => navigation.navigate('RoutineEdit', { routineId: item.id })}
              />
            </View>
          </Pressable>
        )}
      />
      <View style={styles.fabWrap}>
        <Btn title="+ 새 루틴 만들기" onPress={() => navigation.navigate('RoutineEdit')} />
      </View>
    </View>
  );
}

function estimateSec(r: Routine): number {
  return r.exercises.reduce(
    (t, e) =>
      t + e.totalSets * e.exerciseSec + Math.max(0, e.totalSets - 1) * e.restSec,
    0
  );
}

function uniqueParts(r: Routine) {
  return Array.from(new Set(r.exercises.map((e) => e.bodyPart)));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 100 },
  programBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 3 },
  bannerArrow: { color: '#fff', fontSize: 28, fontWeight: '300' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 },
  sub: { color: colors.sub, fontSize: 13, marginTop: 6 },
  parts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, gap: 6 },
  partChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  fabWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
});
