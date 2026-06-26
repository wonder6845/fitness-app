import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Btn, Card, Label, Pill } from '../components/ui';
import {
  defaultProgram,
  FiveByFiveProgram,
  fmtDateKo,
  LIFTS,
  LiftKey,
  Routine5x5,
  routineLabel,
  todayYmd,
  WEEKDAY_OPTIONS,
} from '../data/fivexfive';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { colors, radius, spacing } from '../theme';
import { Unit } from '../types';
import { appAlert } from '../utils/dialog';
import { fmtClock, parseNum, uid } from '../utils/helpers';

type Props = NativeStackScreenProps<RootStackParamList, 'FiveByFiveSetup'>;

const LIFT_ORDER: LiftKey[] = ['squat', 'bench', 'row', 'ohp', 'deadlift'];

export default function FiveByFiveSetupScreen({ navigation, route }: Props) {
  const { fivexfive, saveFivexFive, settings } = useApp();
  const editing = route.params?.edit && fivexfive ? fivexfive : null;
  const base = useMemo(
    () => editing ?? defaultProgram(settings.unit),
    [editing, settings.unit]
  );

  const [name, setName] = useState(base.name);
  const [startDate, setStartDate] = useState(base.startDate);
  const [days, setDays] = useState<number[]>(base.days);
  const [startRoutine, setStartRoutine] = useState<Routine5x5>(base.startRoutine);
  const [unit, setUnit] = useState<Unit>(base.unit);
  const [restSec, setRestSec] = useState(base.restSec);
  const [weights, setWeights] = useState<Record<LiftKey, string>>(() => {
    const w = {} as Record<LiftKey, string>;
    LIFT_ORDER.forEach((k) => (w[k] = String(base.startWeights[k])));
    return w;
  });

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  }
  function changeUnit(u: Unit) {
    if (u === unit) return;
    setUnit(u);
    const d = defaultProgram(u);
    const w = {} as Record<LiftKey, string>;
    LIFT_ORDER.forEach((k) => (w[k] = String(d.startWeights[k])));
    setWeights(w);
  }

  const firstWorkout = useMemo(() => {
    // 시작일 이후(포함) 선택 요일 중 가장 빠른 날
    if (days.length === 0) return null;
    const d = new Date(startDate.split('-').map(Number)[0], (startDate.split('-').map(Number)[1] || 1) - 1, startDate.split('-').map(Number)[2] || 1);
    for (let i = 0; i < 14; i++) {
      if (days.includes(d.getDay())) {
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      d.setDate(d.getDate() + 1);
    }
    return null;
  }, [startDate, days]);

  function save() {
    if (days.length === 0) {
      appAlert('요일 선택', '운동 요일을 최소 1개 선택해주세요.');
      return;
    }
    const startWeights = {} as Record<LiftKey, number>;
    for (const k of LIFT_ORDER) {
      const v = parseNum(weights[k]);
      if (!(v >= 0)) {
        appAlert('중량 확인', `${LIFTS[k].name} 시작 중량을 확인해주세요.`);
        return;
      }
      startWeights[k] = v;
    }
    const program: FiveByFiveProgram = {
      id: editing?.id ?? uid('5x5'),
      name: name.trim() || '5×5 스트렝스',
      unit,
      startDate,
      days,
      restSec,
      startRoutine,
      startWeights,
      increments: editing?.increments ?? defaultProgram(unit).increments,
      skips: editing?.skips ?? [],
      createdAt: editing?.createdAt ?? Date.now(),
    };
    saveFivexFive(program);
    navigation.navigate('FiveByFive');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        StrongLifts 5×5 — 적은 종목을 무겁게, 매 운동마다 조금씩 중량을 올리는 기초 근력 프로그램이에요.
      </Text>

      <Label>프로그램 이름</Label>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="5×5 스트렝스"
        placeholderTextColor={colors.faint}
        style={styles.input}
      />

      <Label style={{ marginTop: spacing.lg }}>시작일</Label>
      <View style={styles.row}>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.faint}
          style={[styles.input, { flex: 1 }]}
        />
        <Btn title="오늘" small variant="secondary" onPress={() => setStartDate(todayYmd())} />
      </View>

      <Label style={{ marginTop: spacing.lg }}>운동 요일 (주 3회 권장)</Label>
      <View style={styles.wrapRow}>
        {WEEKDAY_OPTIONS.map((w) => (
          <Pill
            key={w.idx}
            label={w.label}
            selected={days.includes(w.idx)}
            onPress={() => toggleDay(w.idx)}
          />
        ))}
      </View>
      {firstWorkout && (
        <Text style={styles.hint}>첫 운동: {fmtDateKo(firstWorkout)}</Text>
      )}

      <Label style={{ marginTop: spacing.lg }}>시작 루틴</Label>
      <View style={styles.wrapRow}>
        {(['A', 'B'] as Routine5x5[]).map((r) => (
          <Pill
            key={r}
            label={routineLabel(r)}
            color={colors.accent}
            selected={startRoutine === r}
            onPress={() => setStartRoutine(r)}
          />
        ))}
      </View>
      <Text style={styles.hint}>
        A: 스쿼트·벤치프레스·바벨로우 / B: 스쿼트·오버헤드프레스·데드리프트
      </Text>

      <Label style={{ marginTop: spacing.lg }}>단위</Label>
      <View style={styles.wrapRow}>
        {(['kg', 'lb'] as Unit[]).map((u) => (
          <Pill key={u} label={u} selected={unit === u} onPress={() => changeUnit(u)} />
        ))}
      </View>

      <Label style={{ marginTop: spacing.lg }}>운동별 시작 중량 ({unit})</Label>
      {LIFT_ORDER.map((k) => (
        <View key={k} style={styles.weightRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={styles.weightName}>{LIFTS[k].name}</Text>
          <Text style={styles.weightSpec}>{LIFTS[k].sets}×{LIFTS[k].reps}</Text>
          <TextInput
            value={weights[k]}
            onChangeText={(t) => setWeights((prev) => ({ ...prev, [k]: t }))}
            keyboardType="decimal-pad"
            style={styles.weightInput}
          />
          <Text style={styles.weightUnit}>{unit}</Text>
        </View>
      ))}

      <Label style={{ marginTop: spacing.lg }}>세트 간 휴식</Label>
      <Card style={styles.restCard}>
        <Btn title="−15초" small variant="secondary" onPress={() => setRestSec((s) => Math.max(30, s - 15))} />
        <Text style={styles.restValue}>{fmtClock(restSec)}</Text>
        <Btn title="+15초" small variant="secondary" onPress={() => setRestSec((s) => Math.min(600, s + 15))} />
      </Card>

      <Btn
        title={editing ? '변경 저장' : '5×5 프로그램 시작'}
        onPress={save}
        style={{ marginTop: spacing.xl }}
      />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  lead: { color: colors.sub, fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    padding: spacing.md,
    marginTop: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  hint: { color: colors.faint, fontSize: 12, marginTop: 6 },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  weightName: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  weightSpec: { color: colors.faint, fontSize: 12, fontWeight: '700' },
  weightInput: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 80,
    textAlign: 'right',
  },
  weightUnit: { color: colors.sub, fontSize: 13, fontWeight: '700', width: 22 },
  restCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  restValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
});
