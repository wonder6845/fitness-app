import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { appAlert } from '../utils/dialog';
import { Btn, Label, Pill } from '../components/ui';
import { BODY_PARTS, EQUIPMENT_BRANDS, EQUIPMENTS } from '../data/exercises';
import { RootStackParamList } from '../navigation';
import { useApp } from '../store/AppContext';
import { bodyPartColor, colors, radius, spacing } from '../theme';
import { BodyPart, Equipment, Exercise } from '../types';
import { normalizeName } from '../utils/helpers';

type Props = NativeStackScreenProps<RootStackParamList, 'ExercisePicker'>;

export default function ExercisePickerScreen({ navigation }: Props) {
  const { allExercises, addExercisesToDraft, addCustomExercise } = useApp();

  const [search, setSearch] = useState('');
  const [partFilter, setPartFilter] = useState<BodyPart | null>(null);
  const [equipFilter, setEquipFilter] = useState<Equipment | null>(null);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  // 커스텀 운동 폼
  const [showForm, setShowForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPart, setCustomPart] = useState<BodyPart>('가슴');
  const [customEquip, setCustomEquip] = useState<Equipment>('바벨');

  const filtered = useMemo(() => {
    const q = normalizeName(search);
    return allExercises.filter((e) => {
      if (partFilter && e.bodyPart !== partFilter) return false;
      if (equipFilter && e.equipment !== equipFilter) return false;
      if (brandFilter && e.brand !== brandFilter) return false;
      if (q && !normalizeName(e.name).includes(q)) return false;
      return true;
    });
  }, [allExercises, search, partFilter, equipFilter, brandFilter]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleAdd() {
    const chosen = allExercises.filter((e) => selected.includes(e.id));
    if (chosen.length === 0) {
      navigation.goBack();
      return;
    }
    addExercisesToDraft(chosen);
    navigation.goBack();
  }

  function handleCreateCustom() {
    const res = addCustomExercise({
      name: customName.trim(),
      bodyPart: customPart,
      equipment: customEquip,
    });
    if (!res.ok) {
      appAlert('추가할 수 없어요', res.reason);
      return;
    }
    // 만든 운동을 자동 선택
    setSelected((prev) => [...prev, res.exercise.id]);
    setCustomName('');
    setShowForm(false);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="운동 검색"
          placeholderTextColor={colors.faint}
          style={styles.search}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['전체', ...BODY_PARTS]}
          keyExtractor={(p) => p}
          contentContainerStyle={{ paddingVertical: spacing.sm }}
          renderItem={({ item }) => (
            <Pill
              label={item}
              color={item === '전체' ? colors.primary : bodyPartColor[item as BodyPart]}
              selected={item === '전체' ? partFilter === null : partFilter === item}
              onPress={() =>
                setPartFilter(item === '전체' ? null : (item as BodyPart))
              }
            />
          )}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['전체기구', ...EQUIPMENTS]}
          keyExtractor={(p) => p}
          renderItem={({ item }) => (
            <Pill
              label={item}
              selected={
                item === '전체기구'
                  ? equipFilter === null
                  : equipFilter === item
              }
              onPress={() =>
                setEquipFilter(item === '전체기구' ? null : (item as Equipment))
              }
            />
          )}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['전체브랜드', ...EQUIPMENT_BRANDS]}
          keyExtractor={(p) => p}
          contentContainerStyle={{ paddingBottom: spacing.sm }}
          renderItem={({ item }) => (
            <Pill
              label={item}
              color={item === '전체브랜드' ? colors.primary : '#C08BFF'}
              selected={
                item === '전체브랜드' ? brandFilter === null : brandFilter === item
              }
              onPress={() => setBrandFilter(item === '전체브랜드' ? null : item)}
            />
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}
        ListHeaderComponent={
          <Pressable
            onPress={() => setShowForm((s) => !s)}
            style={styles.createToggle}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {showForm ? '− 커스텀 운동 닫기' : '+ 직접 운동 만들기'}
            </Text>
          </Pressable>
        }
        ListEmptyComponent={
          <Text style={{ color: colors.sub, textAlign: 'center', marginTop: 24 }}>
            검색 결과가 없어요.
          </Text>
        }
        renderItem={({ item }) => (
          <ExerciseRow
            ex={item}
            selected={selected.includes(item.id)}
            onPress={() => toggle(item.id)}
          />
        )}
      />

      {showForm && (
        <View style={styles.formOverlay}>
          <View style={styles.form}>
            <Label>새 운동 이름</Label>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="예: 스미스 인클라인 프레스"
              placeholderTextColor={colors.faint}
              style={styles.search}
            />
            <Label style={{ marginTop: spacing.md }}>부위</Label>
            <View style={styles.wrapRow}>
              {BODY_PARTS.map((p) => (
                <Pill
                  key={p}
                  label={p}
                  color={bodyPartColor[p]}
                  selected={customPart === p}
                  onPress={() => setCustomPart(p)}
                />
              ))}
            </View>
            <Label style={{ marginTop: spacing.sm }}>기구</Label>
            <View style={styles.wrapRow}>
              {EQUIPMENTS.map((q) => (
                <Pill
                  key={q}
                  label={q}
                  selected={customEquip === q}
                  onPress={() => setCustomEquip(q)}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
              <Btn
                title="취소"
                variant="ghost"
                small
                onPress={() => setShowForm(false)}
                style={{ flex: 1 }}
              />
              <Btn
                title="만들기"
                small
                onPress={handleCreateCustom}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      )}

      <View style={styles.bottomBar}>
        <Btn
          title={selected.length > 0 ? `${selected.length}개 추가` : '닫기'}
          onPress={handleAdd}
        />
      </View>
    </View>
  );
}

function ExerciseRow({
  ex,
  selected,
  onPress,
}: {
  ex: Exercise;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <View
        style={[styles.dot, { backgroundColor: bodyPartColor[ex.bodyPart] }]}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>
          {ex.name}
          {ex.isCustom ? '  ✦' : ''}
        </Text>
        <Text style={styles.rowTag}>
          {ex.bodyPart} · {ex.equipment}
        </Text>
      </View>
      <View style={[styles.check, selected && styles.checkOn]}>
        {selected && <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  search: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    padding: spacing.md,
  },
  createToggle: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: '#13203a' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowTag: { color: colors.sub, fontSize: 12, marginTop: 2 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
  formOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 84,
    paddingHorizontal: spacing.lg,
  },
  form: {
    backgroundColor: colors.card2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
  },
  bottomBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
});
