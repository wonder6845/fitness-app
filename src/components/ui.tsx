import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, font, radius, shadow, spacing } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Card ──────────────────────────────────────────────
export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padded?: boolean;
}) {
  const base = [styles.card, padded && { padding: spacing.lg }, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, pressed && { opacity: 0.9, transform: [{ scale: 0.992 }] }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

// ── Button ────────────────────────────────────────────
type BtnVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

export function Btn({
  title,
  onPress,
  variant = 'primary',
  disabled,
  small,
  icon,
  style,
}: {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: BtnVariant;
  disabled?: boolean;
  small?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}) {
  const bg: Record<BtnVariant, string> = {
    primary: colors.primary,
    accent: colors.accent,
    secondary: colors.card2,
    ghost: 'transparent',
    danger: colors.danger,
  };
  const fg: Record<BtnVariant, string> = {
    primary: colors.onPrimary,
    accent: colors.onAccent,
    secondary: colors.text,
    ghost: colors.sub,
    danger: '#fff',
  };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg[variant] },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        disabled && { opacity: 0.35 },
        pressed && !disabled && { transform: [{ scale: 0.97 }], opacity: 0.92 },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={small ? 16 : 19} color={fg[variant]} style={{ marginRight: 7 }} />}
      <Text style={[styles.btnText, small && { fontSize: 14 }, { color: fg[variant] }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  size = 44,
  color = colors.text,
  bg = colors.card2,
}: {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  bg?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
      ]}
    >
      <Ionicons name={icon} size={size * 0.46} color={color} />
    </Pressable>
  );
}

// ── Pill (필터/태그) ─────────────────────────────────
export function Pill({
  label,
  color,
  selected,
  onPress,
}: {
  label: string;
  color?: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const c = color ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? c : colors.card2,
          borderColor: selected ? c : colors.border,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.onPrimary : colors.sub,
          fontSize: 13,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <View style={[styles.tagDot, { backgroundColor: color }]} />
      <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

// ── 헤더 / 섹션 ──────────────────────────────────────
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.screenHeader}>
      <View style={{ flex: 1 }}>
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
        <Text style={font.display}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={font.h2}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// 하위호환 별칭
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={[font.h2, { marginBottom: spacing.md }]}>{children}</Text>;
}

export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Empty({ text, icon }: { text: string; icon?: IconName }) {
  return (
    <View style={styles.empty}>
      {icon && <Ionicons name={icon} size={36} color={colors.faint} style={{ marginBottom: 10 }} />}
      <Text style={{ color: colors.sub, textAlign: 'center', lineHeight: 22 }}>{text}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={[styles.empty, { flex: 1 }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

// ── StatTile (요약 숫자) ─────────────────────────────
export function StatTile({
  value,
  label,
  icon,
  tint = colors.primary,
}: {
  value: string;
  label: string;
  icon?: IconName;
  tint?: string;
}) {
  return (
    <View style={styles.statTile}>
      {icon && <Ionicons name={icon} size={18} color={tint} style={{ marginBottom: 6 }} />}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── ProgressRing (SVG 원형 진행) ─────────────────────
export function ProgressRing({
  size = 248,
  stroke = 14,
  progress,
  color,
  trackColor = 'rgba(255,255,255,0.08)',
  children,
  running,
}: {
  size?: number;
  stroke?: number;
  progress: number; // 0..1 (남은 비율)
  color: string;
  trackColor?: string;
  children?: React.ReactNode;
  running?: boolean; // 진행 중일 때만 리셋 스냅 적용
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const p = clamp(progress);
  const offset = circ * (1 - p);

  // 새 단계로 크게 차오를 땐(리셋) 전환 없이 즉시, 그 외엔 부드럽게 보간
  const prevP = useRef(p);
  const reset = !!running && p > prevP.current + 0.2;
  prevP.current = p;

  // 웹: CSS transition 으로 200ms 갱신 사이를 GPU 보간 → 매 프레임 리렌더 없이 부드러움
  // (react-native-svg 타입에 style 이 없어 any 로 전달 → 웹에서 DOM circle 로 forward)
  const progressProps: Record<string, unknown> = {
    cx: size / 2,
    cy: size / 2,
    r,
    stroke: color,
    strokeWidth: stroke,
    fill: 'none',
    strokeDasharray: circ,
    strokeDashoffset: offset,
    strokeLinecap: 'round',
  };
  if (Platform.OS === 'web') {
    progressProps.style = {
      transitionProperty: 'stroke-dashoffset',
      transitionDuration: reset ? '0ms' : '240ms',
      transitionTimingFunction: 'linear',
    };
  }
  const ProgressCircle = Circle as unknown as React.ComponentType<Record<string, unknown>>;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
          <ProgressCircle {...progressProps} />
        </Svg>
      </View>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: {
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: radius.sm,
  },
  btnText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerSub: { ...font.overline, marginBottom: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  action: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  label: { ...font.label, marginBottom: 7 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  statTile: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { color: colors.sub, fontSize: 12, marginTop: 4, fontWeight: '600' },
});

export { shadow };
