import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appAlert } from '../utils/dialog';
import { Card, ScreenHeader, SectionTitle } from '../components/ui';
import { db } from '../storage/db';
import { useApp } from '../store/AppContext';
import { Unit } from '../types';
import {
  applyTheme,
  colors,
  getCurrentTheme,
  radius,
  spacing,
  THEME_META,
  THEMES,
  ThemeName,
} from '../theme';

export default function SettingsScreen() {
  const {
    settings,
    updateSettings,
    customExercises,
    deleteCustomExercise,
    resetAll,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [theme, setTheme] = useState<ThemeName>(getCurrentTheme());

  function setUnit(unit: Unit) {
    updateSettings({ unit });
  }

  function changeTheme(name: ThemeName) {
    if (name === theme) return;
    setTheme(name);
    db.saveTheme(name);
    applyTheme(name);
    if (Platform.OS === 'web') {
      // 화면들의 StyleSheet에 반영하려면 새로 로드해야 함
      setTimeout(() => {
        (globalThis as { location?: { reload: () => void } }).location?.reload();
      }, 150);
    } else {
      appAlert('테마 변경됨', '앱을 완전히 종료했다가 다시 열면 적용됩니다.');
    }
  }

  function confirmReset() {
    appAlert(
      '전체 데이터 삭제',
      '모든 루틴·기록·설정이 삭제됩니다. 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: resetAll },
      ]
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
    >
      <ScreenHeader title="설정" subtitle="SETTINGS" />

      {/* 테마 */}
      <SectionTitle>테마</SectionTitle>
      <Card style={{ marginBottom: spacing.xl }}>
        <View style={styles.themeRow}>
          {THEME_META.map((t) => {
            const p = THEMES[t.key];
            const on = theme === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => changeTheme(t.key)}
                style={[styles.themeChip, on && { borderColor: colors.primary }]}
              >
                <View style={[styles.swatch, { backgroundColor: p.bg }]}>
                  <View style={[styles.swatchDot, { backgroundColor: p.primary }]} />
                </View>
                <Text style={[styles.themeLabel, on && { color: colors.text }]}>
                  {t.emoji} {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.themeHint}>
          {Platform.OS === 'web'
            ? '선택하면 바로 적용돼요'
            : '선택 후 앱을 다시 열면 적용돼요'}
        </Text>
      </Card>

      {/* 단위 */}
      <SectionTitle>단위</SectionTitle>
      <Card style={{ marginBottom: spacing.xl }}>
        <Row label="무게 단위" sub="새로 기록하는 무게에 적용됩니다">
          <View style={styles.segment}>
            {(['kg', 'lb'] as Unit[]).map((u) => (
              <Pressable
                key={u}
                onPress={() => setUnit(u)}
                style={[
                  styles.segmentItem,
                  settings.unit === u && styles.segmentItemActive,
                ]}
              >
                <Text
                  style={{
                    color: settings.unit === u ? '#fff' : colors.sub,
                    fontWeight: '700',
                  }}
                >
                  {u}
                </Text>
              </Pressable>
            ))}
          </View>
        </Row>
      </Card>

      {/* 타이머/알림 */}
      <SectionTitle>타이머 · 알림</SectionTitle>
      <Card style={{ marginBottom: spacing.xl }}>
        <ToggleRow
          label="세트 시작 전 카운트다운"
          sub="각 세트 운동 직전 3 · 2 · 1 · GO"
          value={settings.readyCountdown}
          onChange={(v) => updateSettings({ readyCountdown: v })}
        />
        <Divider />
        <ToggleRow
          label="RPE 입력칸 표시"
          sub="세트별 주관적 강도(0~10) 기록"
          value={settings.showRPE}
          onChange={(v) => updateSettings({ showRPE: v })}
        />
        <Divider />
        <ToggleRow
          label="단계 전환 진동"
          sub="운동 ↔ 휴식 전환 시 진동"
          value={settings.vibration}
          onChange={(v) => updateSettings({ vibration: v })}
        />
        <Divider />
        <ToggleRow
          label="휴식 종료 카운트다운"
          sub="휴식 종료 3초 전 진동 알림"
          value={settings.countdownBeep}
          onChange={(v) => updateSettings({ countdownBeep: v })}
        />
        <Divider />
        <ToggleRow
          label="운동 중 화면 켜짐 유지"
          sub="운동 진행 화면에서 화면이 꺼지지 않음"
          value={settings.keepAwake}
          onChange={(v) => updateSettings({ keepAwake: v })}
        />
      </Card>

      {/* 커스텀 운동 */}
      <SectionTitle>내 커스텀 운동 ({customExercises.length})</SectionTitle>
      <Card style={{ marginBottom: spacing.xl }}>
        {customExercises.length === 0 ? (
          <Text style={{ color: colors.sub }}>
            루틴 편집 화면의 운동 추가에서 직접 만들 수 있어요.
          </Text>
        ) : (
          customExercises.map((e, i) => (
            <View key={e.id}>
              {i > 0 && <Divider />}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{e.name}</Text>
                  <Text style={styles.rowSub}>
                    {e.bodyPart} · {e.equipment}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    appAlert('운동 삭제', `'${e.name}'을(를) 삭제할까요?`, [
                      { text: '취소', style: 'cancel' },
                      {
                        text: '삭제',
                        style: 'destructive',
                        onPress: () => deleteCustomExercise(e.id),
                      },
                    ])
                  }
                >
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>
                    삭제
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* 데이터 */}
      <SectionTitle>데이터</SectionTitle>
      <Card>
        <Pressable onPress={confirmReset} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.danger }]}>
              전체 데이터 삭제
            </Text>
            <Text style={styles.rowSub}>모든 루틴·기록·설정 초기화</Text>
          </View>
        </Pressable>
      </Card>

      <Text style={styles.version}>헬스 기록 앱 · v1.0 (MVP)</Text>
    </ScrollView>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row label={label} sub={sub}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.card2 }}
        thumbColor="#fff"
      />
    </Row>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48 },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeChip: {
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 76,
  },
  swatch: {
    width: 44,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: { width: 14, height: 14, borderRadius: 7 },
  themeLabel: { color: colors.sub, fontSize: 12, fontWeight: '700', marginTop: 6 },
  themeHint: { color: colors.faint, fontSize: 11, marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.sub, fontSize: 12, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.inputBg,
    borderRadius: radius.sm,
    padding: 3,
  },
  segmentItem: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: radius.sm - 2,
  },
  segmentItemActive: { backgroundColor: colors.primary },
  version: {
    color: colors.faint,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 12,
  },
});
