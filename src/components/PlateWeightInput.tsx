import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { parseNum } from '../utils/helpers';
import {
  computePlates,
  defaultBar,
  defaultPlates,
  isLightPlate,
  plateColor,
} from '../utils/plates';
import BarbellGraphic from './BarbellGraphic';

/**
 * 원판 개수(한쪽)를 ±로 조절해 무게를 만들고, 바벨 그림에 반영.
 * 총 무게 = 바 + 2 × Σ(원판 × 개수)
 */
export default function PlateWeightInput({
  weight,
  onChange,
  unit,
  equipment,
}: {
  weight: number;
  onChange: (w: number) => void;
  unit: string;
  equipment?: string;
}) {
  const plates = defaultPlates(unit); // 큰 것부터
  const dBar = defaultBar(unit);
  // 바벨이면 기본 바 무게, 그 외(맨몸/덤벨 등)는 0에서 시작
  const startBar = weight >= dBar ? dBar : equipment === '바벨' ? dBar : 0;

  const [bar, setBar] = useState(startBar);
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    for (const p of plates) init[p] = 0;
    for (const s of computePlates(weight, startBar, plates).perSide) {
      init[s.plate] = s.count;
    }
    return init;
  });
  // 무게 직접 입력값(문자열) + 원판으로 못 맞춘 잔여(한쪽)
  const [targetText, setTargetText] = useState(() => String(weight || 0));
  const [leftover, setLeftover] = useState(0);

  const calcTotal = (b: number, c: Record<number, number>) =>
    Math.round(
      (b + 2 * plates.reduce((t, p) => t + p * (c[p] || 0), 0)) * 100
    ) / 100;

  const total = calcTotal(bar, counts);

  // 마운트 시 한 번 동기화(분해된 무게로 set.weight 맞춤)
  const synced = useRef(false);
  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      onChange(total);
      setTargetText(String(total));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function apply(b: number, c: Record<number, number>, lo = 0) {
    const t = calcTotal(b, c);
    onChange(t);
    setTargetText(String(t));
    setLeftover(lo);
  }
  function setCount(p: number, n: number) {
    const next = { ...counts, [p]: Math.max(0, n) };
    setCounts(next);
    apply(bar, next);
  }
  function changeBar(d: number) {
    const nb = Math.max(0, Math.round((bar + d) * 100) / 100);
    setBar(nb);
    apply(nb, counts);
  }

  // 입력한 무게를 원판 구성으로 분해
  function decompose(target: number) {
    const res = computePlates(target, bar, plates);
    const next: Record<number, number> = {};
    for (const p of plates) next[p] = 0;
    for (const s of res.perSide) next[s.plate] = s.count;
    return { next, leftover: res.leftover };
  }
  // 타이핑 즉시: 입력 텍스트는 유지하고 원판/그림만 실시간 반영
  function onWeightChange(text: string) {
    setTargetText(text);
    const target = parseNum(text);
    if (!(target > 0)) return;
    const { next, leftover: lo } = decompose(target);
    setCounts(next);
    onChange(calcTotal(bar, next));
    setLeftover(lo);
  }
  // 입력 완료(엔터/포커스 아웃): 실제 맞춰진 무게로 텍스트 정리
  function normalizeTarget() {
    const target = parseNum(targetText);
    if (!(target > 0)) {
      setTargetText(String(total));
      setLeftover(0);
      return;
    }
    const { next, leftover: lo } = decompose(target);
    setCounts(next);
    apply(bar, next, lo);
  }

  const perSide = plates
    .map((p) => ({ plate: p, count: counts[p] || 0 }))
    .filter((x) => x.count > 0);

  return (
    <View>
      {/* 무게 직접 입력 → 원판 자동 계산 */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>무게</Text>
        <TextInput
          style={styles.totalInput}
          keyboardType="decimal-pad"
          value={targetText}
          onChangeText={onWeightChange}
          onSubmitEditing={normalizeTarget}
          onBlur={normalizeTarget}
          returnKeyType="done"
          selectTextOnFocus
        />
        <Text style={styles.totalUnit}>{unit}</Text>
      </View>
      {leftover > 0 ? (
        <Text style={styles.leftoverNote}>
          원판으로 {Math.round(leftover * 2 * 100) / 100}
          {unit}는 못 맞춰서 {total}
          {unit}로 설정했어요
        </Text>
      ) : (
        <Text style={styles.hint}>무게를 입력하면 원판이 자동으로 배치돼요</Text>
      )}
      <View style={styles.graphic}>
        <BarbellGraphic perSide={perSide} unit={unit} height={84} />
      </View>

      {/* 원판별 ± */}
      <Text style={styles.section}>원판 (한쪽 기준)</Text>
      {plates.map((p) => {
        const light = isLightPlate(p, unit);
        return (
          <View key={p} style={styles.plateRow}>
            <View style={[styles.chip, { backgroundColor: plateColor(p, unit) }]}>
              <Text style={[styles.chipText, { color: light ? '#111' : '#fff' }]}>
                {p}
                {unit}
              </Text>
            </View>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => setCount(p, (counts[p] || 0) - 1)}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.count}>{counts[p] || 0}</Text>
              <Pressable style={styles.stepBtn} onPress={() => setCount(p, (counts[p] || 0) + 1)}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* 바 무게 */}
      <View style={styles.barRow}>
        <Text style={styles.barLabel}>바 무게</Text>
        <View style={styles.stepper}>
          <Pressable style={styles.stepBtn} onPress={() => changeBar(-2.5)}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.count}>
            {bar}
            {unit}
          </Text>
          <Pressable style={styles.stepBtn} onPress={() => changeBar(2.5)}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalLabel: { color: colors.sub, fontSize: 13, fontWeight: '600' },
  totalInput: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    minWidth: 70,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  totalUnit: { color: colors.text, fontSize: 18, fontWeight: '800' },
  leftoverNote: { color: '#FFC24B', fontSize: 12, marginTop: 6 },
  hint: { color: colors.faint, fontSize: 12, marginTop: 6 },
  graphic: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  section: { color: colors.sub, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  chip: {
    minWidth: 64,
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipText: { fontWeight: '800', fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.text, fontSize: 22, fontWeight: '800' },
  count: { color: colors.text, fontSize: 17, fontWeight: '800', minWidth: 46, textAlign: 'center' },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  barLabel: { color: colors.sub, fontSize: 13, fontWeight: '700' },
});
