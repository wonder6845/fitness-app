import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LineChart, { ChartPoint } from '../components/LineChart';
import { Btn, Card } from '../components/ui';
import { BODY_METRICS, BodyMetric, bodyUnit } from '../data/body';
import { useApp } from '../store/AppContext';
import { colors, radius, spacing } from '../theme';
import { parseNum } from '../utils/helpers';

export default function BodyScreen() {
  const { bodyLog, addBodyEntry, settings } = useApp();
  const [editing, setEditing] = useState<BodyMetric | null>(null);
  const [input, setInput] = useState('');

  const byMetric = useMemo(() => {
    const map: Record<string, ChartPoint[]> = {};
    for (const m of BODY_METRICS) map[m.key] = [];
    for (const e of bodyLog) {
      if (map[e.metric]) map[e.metric].push({ ts: e.ts, value: e.value });
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => a.ts - b.ts);
    return map;
  }, [bodyLog]);

  function openEntry(m: BodyMetric) {
    setEditing(m);
    setInput('');
  }

  function saveEntry() {
    if (!editing) return;
    const v = parseNum(input);
    if (v > 0) addBodyEntry(editing.key, v);
    setEditing(null);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          체중과 신체 치수를 기록하면 변화를 그래프로 볼 수 있어요.
        </Text>
        {BODY_METRICS.map((m) => {
          const points = byMetric[m.key];
          const latest = points[points.length - 1];
          const u = bodyUnit(m.unitType, settings.unit);
          return (
            <Card key={m.key} style={{ marginBottom: spacing.md }}>
              <View style={styles.head}>
                <View style={[styles.dot, { backgroundColor: m.color }]} />
                <Text style={styles.metricName}>{m.label}</Text>
                <Text style={styles.latest}>
                  {latest ? `${latest.value}${u}` : '기록 없음'}
                </Text>
                <Pressable onPress={() => openEntry(m)} style={styles.addBtn}>
                  <Ionicons name="add" size={20} color={colors.onPrimary} />
                </Pressable>
              </View>
              {points.length >= 2 && (
                <View style={{ marginTop: spacing.sm }}>
                  <LineChart data={points} color={m.color} unit={u} height={130} />
                </View>
              )}
              {points.length === 1 && (
                <Text style={styles.onePoint}>
                  기록이 1개예요. 2개부터 그래프가 그려집니다.
                </Text>
              )}
            </Card>
          );
        })}
      </ScrollView>

      {/* 입력 모달 */}
      <Modal
        transparent
        visible={editing !== null}
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.backdrop}>
          {editing && (
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editing.label} 기록</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={input}
                  onChangeText={setInput}
                  placeholder="0"
                  placeholderTextColor={colors.faint}
                  autoFocus
                />
                <Text style={styles.unit}>
                  {bodyUnit(editing.unitType, settings.unit)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.lg }}>
                <Btn
                  title="취소"
                  variant="secondary"
                  onPress={() => setEditing(null)}
                  style={{ flex: 1 }}
                />
                <Btn title="저장" onPress={saveEntry} style={{ flex: 1 }} />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  lead: { color: colors.sub, fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  metricName: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  latest: { color: colors.sub, fontSize: 14, fontWeight: '700' },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onePoint: { color: colors.faint, fontSize: 12, marginTop: spacing.sm },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.lg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    paddingVertical: 12,
  },
  unit: { color: colors.sub, fontSize: 16, fontWeight: '700' },
});
