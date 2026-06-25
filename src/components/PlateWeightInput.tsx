import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setCount(p: number, n: number) {
    const next = { ...counts, [p]: Math.max(0, n) };
    setCounts(next);
    onChange(calcTotal(bar, next));
  }
  function changeBar(d: number) {
    const nb = Math.max(0, Math.round((bar + d) * 100) / 100);
    setBar(nb);
    onChange(calcTotal(nb, counts));
  }

  const perSide = plates
    .map((p) => ({ plate: p, count: counts[p] || 0 }))
    .filter((x) => x.count > 0);

  return (
    <View>
      {/* 총 무게 + 그림 */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>무게</Text>
        <Text style={styles.totalValue}>
          {total}
          {unit}
        </Text>
      </View>
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
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  totalLabel: { color: colors.sub, fontSize: 13, fontWeight: '600' },
  totalValue: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
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
