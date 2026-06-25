import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { isLightPlate, plateColor, PlateStack, plateSizeRef } from '../utils/plates';

/**
 * 바벨 + 한쪽 원판을 무게별 크기·색으로 그림. (PlateCalculator / PlateWeightInput 공용)
 */
export default function BarbellGraphic({
  perSide,
  unit,
  height = 92,
}: {
  perSide: PlateStack[]; // 한쪽 원판 구성 (무거운 순 권장)
  unit: string;
  height?: number;
}) {
  const maxRef = plateSizeRef(unit);
  const flat: number[] = [...perSide]
    .sort((a, b) => b.plate - a.plate)
    .flatMap((s) => Array(s.count).fill(s.plate));
  const plateH = (p: number) => Math.round(26 + Math.min(1, p / maxRef) * 52);
  const plateW = (p: number) => Math.round(10 + Math.min(1, p / maxRef) * 9);

  if (flat.length === 0) {
    return (
      <View style={[styles.barbell, { minHeight: height, paddingLeft: 0 }]}>
        <View style={styles.shaft} />
        <View style={styles.sleeve} />
        <View style={styles.collar} />
        <Text style={styles.emptyText}>바만 (원판 없음)</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.barbell, { minHeight: height }]}
    >
      <View style={styles.shaft} />
      <View style={styles.sleeve} />
      {flat.map((p, i) => (
        <View key={i} style={styles.plateWrap}>
          <View
            style={[
              styles.plate,
              {
                height: plateH(p),
                width: plateW(p),
                backgroundColor: plateColor(p, unit),
                borderColor: isLightPlate(p, unit) ? '#B9BDC7' : 'rgba(0,0,0,0.35)',
              },
            ]}
          />
          <Text style={styles.plateMini}>{p}</Text>
        </View>
      ))}
      <View style={styles.collar} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  barbell: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  shaft: { width: 30, height: 7, borderRadius: 2, backgroundColor: '#A2ABBA' },
  sleeve: { width: 13, height: 18, borderRadius: 2, backgroundColor: '#6B7280' },
  plateWrap: { alignItems: 'center', marginHorizontal: 1.5 },
  plate: { borderRadius: 3, borderWidth: 1 },
  plateMini: { color: colors.faint, fontSize: 8, marginTop: 3 },
  collar: { width: 8, height: 24, borderRadius: 2, backgroundColor: '#4B5563', marginLeft: 4 },
  emptyText: { color: colors.faint, fontSize: 12, marginLeft: 10 },
});
