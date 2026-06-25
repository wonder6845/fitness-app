import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { Btn } from './ui';

export default function PlateCalculator({
  visible,
  onClose,
  initialWeight,
  unit,
}: {
  visible: boolean;
  onClose: () => void;
  initialWeight?: number;
  unit: string;
}) {
  const [target, setTarget] = useState('');
  const [bar, setBar] = useState(defaultBar(unit));

  // 모달이 열릴 때 초기 무게/바 세팅
  React.useEffect(() => {
    if (visible) {
      setTarget(initialWeight && initialWeight > 0 ? String(initialWeight) : '');
      setBar(defaultBar(unit));
    }
  }, [visible, initialWeight, unit]);

  const plates = defaultPlates(unit);
  const targetNum = parseNum(target);
  const result = useMemo(
    () => computePlates(targetNum, bar, plates),
    [targetNum, bar, plates]
  );

  const flatPlates: number[] = result.perSide.flatMap((s) =>
    Array(s.count).fill(s.plate)
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>🏋️ 원판 계산기</Text>

          {/* 목표 중량 */}
          <Text style={styles.label}>목표 중량 ({unit})</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={target}
            onChangeText={setTarget}
            placeholder="예: 100"
            placeholderTextColor={colors.faint}
            autoFocus
          />

          {/* 바 무게 */}
          <View style={styles.barRow}>
            <Text style={styles.label}>바 무게</Text>
            <View style={styles.stepper}>
              <Pressable onPress={() => setBar((b) => Math.max(0, b - 2.5))} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Text style={styles.barVal}>
                {bar}
                {unit}
              </Text>
              <Pressable onPress={() => setBar((b) => b + 2.5)} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* 결과 */}
          <View style={styles.resultBox}>
            {targetNum <= bar ? (
              <Text style={styles.hint}>바보다 무거운 목표 중량을 입력하세요.</Text>
            ) : (
              <>
                <Text style={styles.sideLabel}>
                  한쪽에 올릴 원판 (총 {result.perSideWeight}
                  {unit})
                </Text>

                {/* 바벨 그림 */}
                {flatPlates.length === 0 ? (
                  <Text style={styles.hint}>맞는 원판 조합이 없어요.</Text>
                ) : (
                  <View style={styles.barbellScroll}>
                    <BarbellGraphic perSide={result.perSide} unit={unit} />
                  </View>
                )}

                {/* 색상 범례 */}
                {result.perSide.length > 0 && (
                  <View style={styles.plateRow}>
                    {result.perSide.map((p) => (
                      <View
                        key={p.plate}
                        style={[
                          styles.plateChip,
                          { backgroundColor: plateColor(p.plate, unit) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.plateText,
                            { color: isLightPlate(p.plate, unit) ? '#111' : '#fff' },
                          ]}
                        >
                          {p.plate}
                          {unit}
                        </Text>
                        <Text
                          style={[
                            styles.plateCount,
                            { color: isLightPlate(p.plate, unit) ? '#333' : '#fff' },
                          ]}
                        >
                          ×{p.count}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {result.leftover > 0 && (
                  <Text style={styles.leftover}>
                    ⚠️ 보유 원판으로 {result.leftover}
                    {unit} 부족 (한쪽)
                  </Text>
                )}
                <Text style={styles.totalText}>
                  바 {bar} + 양쪽 {result.perSideWeight * 2} ={' '}
                  {bar + result.perSideWeight * 2}
                  {unit}
                </Text>
              </>
            )}
          </View>

          <Btn title="닫기" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.lg },
  label: { color: colors.sub, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: colors.text, fontSize: 20, fontWeight: '800' },
  barVal: { color: colors.text, fontSize: 16, fontWeight: '800', minWidth: 56, textAlign: 'center' },
  resultBox: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 90,
  },
  sideLabel: { color: colors.sub, fontSize: 13, fontWeight: '700', marginBottom: spacing.md },
  barbellScroll: { marginBottom: spacing.md },
  barbell: { flexDirection: 'row', alignItems: 'center', minHeight: 92, paddingRight: 8 },
  shaft: { width: 30, height: 7, borderRadius: 2, backgroundColor: '#A2ABBA' },
  sleeve: { width: 13, height: 18, borderRadius: 2, backgroundColor: '#6B7280' },
  plateWrap: { alignItems: 'center', marginHorizontal: 1.5 },
  plate: { borderRadius: 3, borderWidth: 1 },
  plateMini: { color: colors.faint, fontSize: 8, marginTop: 3 },
  collar: {
    width: 8,
    height: 24,
    borderRadius: 2,
    backgroundColor: '#4B5563',
    marginLeft: 4,
  },
  plateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  plateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  plateText: { color: colors.onPrimary, fontWeight: '800', fontSize: 14 },
  plateCount: { color: colors.onPrimary, fontWeight: '700', fontSize: 12, opacity: 0.8 },
  leftover: { color: colors.warn, fontSize: 12, marginTop: spacing.sm, fontWeight: '600' },
  totalText: { color: colors.faint, fontSize: 12, marginTop: spacing.sm },
  hint: { color: colors.faint, fontSize: 13 },
});
