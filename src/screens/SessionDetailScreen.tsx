import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { appAlert } from '../utils/dialog';
import { Btn, Card } from '../components/ui';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { bodyPartColor, colors, radius, spacing } from '../theme';
import { ExerciseRecord, SetRecord } from '../types';
import {
  completedSetCount,
  fmtDateKorean,
  fmtDuration,
  fmtTime,
  parseNum,
  sessionVolume,
  totalSetCount,
} from '../utils/helpers';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>;

export default function SessionDetailScreen({ navigation, route }: Props) {
  const { sessions, updateSession, deleteSession } = useApp();
  const session = sessions.find((s) => s.id === route.params.sessionId);

  const [records, setRecords] = useState<ExerciseRecord[]>(() =>
    session ? JSON.parse(JSON.stringify(session.records)) : []
  );
  const [memo, setMemo] = useState(session?.memo ?? '');
  const [dirty, setDirty] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        session ? (
          <Pressable onPress={confirmDelete} hitSlop={10}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>삭제</Text>
          </Pressable>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, session]);

  const volume = useMemo(() => sessionVolume(records), [records]);

  if (!session) {
    return (
      <View style={styles.screen}>
        <Text style={{ color: colors.sub, padding: spacing.lg }}>
          기록을 찾을 수 없어요. 삭제되었을 수 있습니다.
        </Text>
      </View>
    );
  }

  function patchSet(exIndex: number, setNo: number, patch: Partial<SetRecord>) {
    setDirty(true);
    setRecords((rs) =>
      rs.map((r, i) =>
        i !== exIndex
          ? r
          : {
              ...r,
              sets: r.sets.map((st) =>
                st.setNo === setNo ? { ...st, ...patch } : st
              ),
            }
      )
    );
  }

  function handleSave() {
    if (!session) return;
    updateSession({
      ...session,
      records,
      memo: memo.trim(),
      totalVolume: sessionVolume(records),
    });
    setDirty(false);
    appAlert('저장됨', '기록이 수정되었어요.');
  }

  function confirmDelete() {
    appAlert('기록 삭제', '이 운동 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteSession(route.params.sessionId);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.title}>{session.routineName}</Text>
        <Text style={styles.date}>
          {fmtDateKorean(session.startedAt)} · {fmtTime(session.startedAt)}
        </Text>
        <View style={styles.summaryRow}>
          <Stat value={`${volume.toLocaleString()}${session.unit}`} label="총 볼륨" />
          <View style={styles.vline} />
          <Stat value={fmtDuration(session.durationSec)} label="소요 시간" />
          <View style={styles.vline} />
          <Stat
            value={`${completedSetCount(records)}/${totalSetCount(records)}`}
            label="완료 세트"
          />
        </View>
      </Card>

      {records.map((rec, exIndex) => (
        <Card key={`${rec.exerciseId}-${exIndex}`} style={{ marginBottom: spacing.md }}>
          <View style={styles.exHead}>
            <View
              style={[styles.dot, { backgroundColor: bodyPartColor[rec.bodyPart] }]}
            />
            <Text style={styles.exName}>{rec.exerciseName}</Text>
            <Text style={styles.exTag}>
              {rec.bodyPart} · {rec.equipment}
            </Text>
          </View>

          <View style={styles.headerRow}>
            <Text style={[styles.th, { width: 40 }]}>세트</Text>
            <Text style={[styles.th, { flex: 1 }]}>무게({session.unit})</Text>
            <Text style={[styles.th, { flex: 1 }]}>횟수</Text>
            <Text style={[styles.th, { width: 50 }]}>상태</Text>
          </View>
          {rec.sets.map((set) => (
            <View key={set.setNo} style={styles.setRow}>
              <Text
                style={[
                  styles.setNo,
                  set.type === 'warmup' && { color: colors.warn },
                  set.type === 'drop' && { color: '#C08BFF' },
                ]}
              >
                {set.type === 'warmup' ? 'W' : set.type === 'drop' ? 'D' : set.setNo}
              </Text>
              <View style={{ flex: 1, paddingHorizontal: 4 }}>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={set.weight ? String(set.weight) : ''}
                  placeholder="0"
                  placeholderTextColor={colors.faint}
                  onChangeText={(t) =>
                    patchSet(exIndex, set.setNo, { weight: parseNum(t) })
                  }
                />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 4 }}>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={set.reps ? String(set.reps) : ''}
                  placeholder="0"
                  placeholderTextColor={colors.faint}
                  onChangeText={(t) =>
                    patchSet(exIndex, set.setNo, { reps: Math.round(parseNum(t)) })
                  }
                />
              </View>
              <Pressable
                style={{ width: 50, alignItems: 'center' }}
                onPress={() =>
                  patchSet(exIndex, set.setNo, {
                    completed: !set.completed,
                    skipped: false,
                  })
                }
              >
                <Text
                  style={{
                    color: set.skipped
                      ? colors.danger
                      : set.completed
                      ? colors.accent
                      : colors.faint,
                    fontWeight: '800',
                    fontSize: 13,
                  }}
                >
                  {set.skipped ? '건너뜀' : set.completed ? '완료' : '미완료'}
                </Text>
                {set.rpe ? (
                  <Text style={{ color: colors.faint, fontSize: 10, marginTop: 2 }}>
                    RPE {set.rpe}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          ))}

          {rec.memo ? <Text style={styles.exMemo}>📝 {rec.memo}</Text> : null}
        </Card>
      ))}

      {/* 세션 메모 */}
      <Text style={styles.memoLabel}>운동 메모</Text>
      <TextInput
        style={styles.memo}
        value={memo}
        onChangeText={(t) => {
          setMemo(t);
          setDirty(true);
        }}
        placeholder="이 날 운동에 대한 메모"
        placeholderTextColor={colors.faint}
        multiline
      />

      <Btn
        title={dirty ? '변경사항 저장' : '저장됨'}
        onPress={handleSave}
        disabled={!dirty}
        style={{ marginTop: spacing.lg }}
      />
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  date: { color: colors.sub, fontSize: 13, marginTop: 4 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  vline: { width: 1, height: 30, backgroundColor: colors.border },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '800' },
  statLabel: { color: colors.sub, fontSize: 12, marginTop: 4 },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  exName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  exTag: { color: colors.sub, fontSize: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: { color: colors.sub, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  setNo: { width: 40, textAlign: 'center', color: colors.text, fontWeight: '800' },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    textAlign: 'center',
    paddingVertical: 7,
    fontSize: 15,
    fontWeight: '700',
  },
  exMemo: { color: colors.sub, fontSize: 13, marginTop: spacing.sm },
  memoLabel: {
    color: colors.sub,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  memo: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
