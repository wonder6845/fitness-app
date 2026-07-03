import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { appAlert } from '../utils/dialog';
import { Btn, Empty, Label } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { bodyPartColor, colors, radius, spacing } from '../theme';
import { RoutineExercise } from '../types';
import { fmtClock, uid } from '../utils/helpers';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutineEdit'>;

export default function RoutineEditScreen({ navigation, route }: Props) {
  const routineId = route.params?.routineId;
  const {
    getRoutine,
    saveRoutine,
    draftRoutine,
    beginEditRoutine,
    updateDraftRoutine,
    setDraftExercises,
    endEditRoutine,
  } = useApp();

  const savedRef = useRef(false);

  // 최초 진입 시 편집 버퍼 초기화 (1회)
  useEffect(() => {
    const existing = routineId ? getRoutine(routineId) : undefined;
    if (existing) {
      beginEditRoutine(JSON.parse(JSON.stringify(existing)));
    } else {
      const now = Date.now();
      beginEditRoutine({
        id: uid('rt'),
        name: '',
        exercises: [],
        createdAt: now,
        updatedAt: now,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    if (!draftRoutine) return;
    const name = draftRoutine.name.trim();
    if (!name) {
      appAlert('이름 필요', '루틴 이름을 입력해주세요.');
      return;
    }
    if (draftRoutine.exercises.length === 0) {
      appAlert('운동 필요', '운동을 1개 이상 추가해주세요.');
      return;
    }
    savedRef.current = true;
    saveRoutine({ ...draftRoutine, name, updatedAt: Date.now() });
    endEditRoutine();
    navigation.goBack();
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSave} hitSlop={10}>
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>
            저장
          </Text>
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, draftRoutine]);

  // 미저장 이탈 확인
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      const dirty =
        !!draftRoutine &&
        (draftRoutine.name.trim() !== '' || draftRoutine.exercises.length > 0);
      if (savedRef.current || !dirty) {
        endEditRoutine();
        return;
      }
      e.preventDefault();
      appAlert('저장하지 않고 나갈까요?', '편집 중인 내용이 사라집니다.', [
        { text: '계속 편집', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => {
            endEditRoutine();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsub;
  }, [navigation, draftRoutine, endEditRoutine]);

  if (!draftRoutine) return null;

  function patchExercise(index: number, patch: Partial<RoutineExercise>) {
    const next = draftRoutine!.exercises.map((ex, i) =>
      i === index ? { ...ex, ...patch } : ex
    );
    setDraftExercises(next);
  }

  function removeExercise(index: number) {
    setDraftExercises(draftRoutine!.exercises.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const arr = [...draftRoutine!.exercises];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    setDraftExercises(arr);
  }

  // index 운동을 바로 위(index-1) 운동과 슈퍼셋으로 묶거나 해제
  function toggleSuperset(index: number) {
    if (index < 1) return;
    const arr = draftRoutine!.exercises.map((e) => ({ ...e }));
    const prev = arr[index - 1];
    const cur = arr[index];
    const linked =
      !!cur.supersetGroup && cur.supersetGroup === prev.supersetGroup;
    if (linked) {
      const g = cur.supersetGroup;
      cur.supersetGroup = undefined;
      // 이전 운동이 더 이상 그룹 멤버가 없으면 그룹 해제
      const stillUsed = arr.some(
        (e, k) => k !== index && e.supersetGroup === g
      );
      if (!stillUsed) prev.supersetGroup = undefined;
    } else {
      const g = prev.supersetGroup ?? uid('ss');
      prev.supersetGroup = g;
      cur.supersetGroup = g;
    }
    setDraftExercises(arr);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Label>루틴 이름</Label>
        <TextInput
          value={draftRoutine.name}
          onChangeText={(t) => updateDraftRoutine({ name: t })}
          placeholder="예: 가슴 + 삼두 데이"
          placeholderTextColor={colors.faint}
          style={styles.nameInput}
        />

        <View style={styles.sectionHeader}>
          <Label>운동 ({draftRoutine.exercises.length})</Label>
        </View>

        {draftRoutine.exercises.length === 0 && (
          <Empty text={'추가된 운동이 없어요.\n아래에서 운동을 추가하세요.'} />
        )}

        {draftRoutine.exercises.map((ex, i) => {
          const prev = i > 0 ? draftRoutine.exercises[i - 1] : undefined;
          const linkedAbove =
            !!ex.supersetGroup && !!prev && ex.supersetGroup === prev.supersetGroup;
          return (
            <View key={`${ex.exerciseId}-${i}`}>
              {i > 0 && (
                <Pressable
                  onPress={() => toggleSuperset(i)}
                  style={[styles.ssLink, linkedAbove && styles.ssLinkOn]}
                >
                  <Ionicons
                    name={linkedAbove ? 'link' : 'link-outline'}
                    size={13}
                    color={linkedAbove ? colors.onPrimary : colors.sub}
                  />
                  <Text style={[styles.ssLinkText, linkedAbove && { color: colors.onPrimary }]}>
                    {linkedAbove ? '슈퍼셋으로 묶임' : '위 운동과 슈퍼셋'}
                  </Text>
                </Pressable>
              )}
              <View style={[styles.exCard, !!ex.supersetGroup && styles.exCardLinked]}>
                <View style={styles.exHeader}>
              <View
                style={[styles.dot, { backgroundColor: bodyPartColor[ex.bodyPart] }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{ex.name}</Text>
                <Text style={styles.exTag}>
                  {ex.bodyPart} · {ex.equipment}
                </Text>
              </View>
              <View style={styles.moveBtns}>
                <Pressable onPress={() => move(i, -1)} hitSlop={6}>
                  <Text style={styles.moveIcon}>▲</Text>
                </Pressable>
                <Pressable onPress={() => move(i, 1)} hitSlop={6}>
                  <Text style={styles.moveIcon}>▼</Text>
                </Pressable>
                <Pressable onPress={() => removeExercise(i)} hitSlop={6}>
                  <Text style={[styles.moveIcon, { color: colors.danger }]}>✕</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.steppers}>
              <Stepper
                label="세트"
                value={ex.totalSets}
                display={`${ex.totalSets}`}
                onMinus={() =>
                  patchExercise(i, { totalSets: Math.max(1, ex.totalSets - 1) })
                }
                onPlus={() =>
                  patchExercise(i, { totalSets: Math.min(20, ex.totalSets + 1) })
                }
              />
              <Stepper
                label="휴식 시간"
                value={ex.restSec}
                display={fmtClock(ex.restSec)}
                onMinus={() =>
                  patchExercise(i, { restSec: Math.max(0, ex.restSec - 5) })
                }
                onPlus={() => patchExercise(i, { restSec: ex.restSec + 5 })}
              />
            </View>
              </View>
            </View>
          );
        })}

        <Btn
          title="+ 운동 추가"
          variant="secondary"
          onPress={() => navigation.navigate('ExercisePicker')}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Btn title="루틴 저장" onPress={handleSave} />
      </View>
    </View>
  );
}

function Stepper({
  label,
  display,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  display: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable onPress={onMinus} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{display}</Text>
        <Pressable onPress={onPlus} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 120 },
  nameInput: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: { marginTop: spacing.sm },
  exCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  exCardLinked: { borderColor: colors.accent, borderLeftWidth: 3 },
  ssLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card2,
    marginBottom: spacing.md,
    marginTop: -4,
  },
  ssLinkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  ssLinkText: { color: colors.sub, fontSize: 12, fontWeight: '700' },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  exName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  exTag: { color: colors.sub, fontSize: 12, marginTop: 2 },
  moveBtns: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  moveIcon: { color: colors.sub, fontSize: 15, fontWeight: '700' },
  steppers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: 8,
  },
  stepper: { flex: 1, alignItems: 'center' },
  stepperLabel: { color: colors.sub, fontSize: 12, marginBottom: 6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: colors.text, fontSize: 18, fontWeight: '800' },
  stepValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
});
