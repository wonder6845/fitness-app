import { TextStyle, ViewStyle } from 'react-native';
import { BodyPart } from './types';

// ── 테마 ──────────────────────────────────────────────
// 앱 전체 색은 mutable한 colors 객체를 통해 쓰인다.
// 화면들의 StyleSheet가 모듈 로드 시점에 색을 캡처하므로,
// 저장된 테마는 index.ts 부트스트랩에서 applyTheme() 후 앱을 로드해 적용한다.
export type ThemeName = 'black' | 'white' | 'metal' | 'green' | 'butter';

interface ThemeColors {
  bg: string;
  bgElev: string;
  card: string;
  card2: string;
  elevated: string;
  inputBg: string;
  text: string;
  sub: string;
  faint: string;
  border: string;
  hairline: string;
  primary: string;
  primaryDark: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  danger: string;
  warn: string;
  exercise: string;
  rest: string;
  selectedBg: string; // 선택된 행 배경
  primarySoft: string; // primary 톤의 옅은 카드 배경
  accentSoft: string; // accent 톤의 옅은 카드 배경
  statusBar: 'light' | 'dark';
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  // 다크 차콜 + 라임 (기본, 애슬레저/퍼포먼스 무드)
  black: {
    bg: '#0A0B0F',
    bgElev: '#0F1117',
    card: '#15171F',
    card2: '#1D2029',
    elevated: '#272B37',
    inputBg: '#0C0E13',
    text: '#F3F5FA',
    sub: '#9AA1B2',
    faint: '#596071',
    border: 'rgba(255,255,255,0.07)',
    hairline: 'rgba(255,255,255,0.045)',
    primary: '#CBFB45',
    primaryDark: '#A6E22E',
    onPrimary: '#0A0B0F',
    accent: '#2DD4BF',
    onAccent: '#05221E',
    danger: '#FF5D5D',
    warn: '#FFB020',
    exercise: '#CBFB45',
    rest: '#38BDF8',
    selectedBg: '#13203a',
    primarySoft: '#16210f',
    accentSoft: '#101c19',
    statusBar: 'light',
  },
  // 밝고 깨끗한 라이트
  white: {
    bg: '#F6F7FA',
    bgElev: '#FFFFFF',
    card: '#FFFFFF',
    card2: '#F0F2F7',
    elevated: '#E7EAF1',
    inputBg: '#EDEFF4',
    text: '#14161C',
    sub: '#5A6172',
    faint: '#9AA1B2',
    border: 'rgba(10,20,40,0.10)',
    hairline: 'rgba(10,20,40,0.06)',
    primary: '#65A30D',
    primaryDark: '#4D7C0F',
    onPrimary: '#FFFFFF',
    accent: '#0D9488',
    onAccent: '#FFFFFF',
    danger: '#E11D48',
    warn: '#D97706',
    exercise: '#65A30D',
    rest: '#0284C7',
    selectedBg: '#E5EEDA',
    primarySoft: '#F0F6E4',
    accentSoft: '#E2F2EF',
    statusBar: 'dark',
  },
  // 건메탈 + 실버/스틸 블루
  metal: {
    bg: '#101216',
    bgElev: '#161A20',
    card: '#1C2129',
    card2: '#242A34',
    elevated: '#2E3543',
    inputBg: '#12151B',
    text: '#E8ECF3',
    sub: '#98A2B3',
    faint: '#5C6678',
    border: 'rgba(255,255,255,0.09)',
    hairline: 'rgba(255,255,255,0.05)',
    primary: '#A9C3DE',
    primaryDark: '#7FA3C8',
    onPrimary: '#0F1319',
    accent: '#67E8F9',
    onAccent: '#062A30',
    danger: '#F87171',
    warn: '#FBBF24',
    exercise: '#A9C3DE',
    rest: '#67E8F9',
    selectedBg: '#1D2836',
    primarySoft: '#1B222C',
    accentSoft: '#14232A',
    statusBar: 'light',
  },
  // 딥 포레스트 + 에메랄드
  green: {
    bg: '#0A120D',
    bgElev: '#0E1712',
    card: '#132019',
    card2: '#19291F',
    elevated: '#213528',
    inputBg: '#0C1510',
    text: '#EDF7F0',
    sub: '#93A99A',
    faint: '#5A6F61',
    border: 'rgba(255,255,255,0.07)',
    hairline: 'rgba(255,255,255,0.045)',
    primary: '#34D399',
    primaryDark: '#10B981',
    onPrimary: '#052E1F',
    accent: '#A3E635',
    onAccent: '#1A2E05',
    danger: '#FF6B6B',
    warn: '#FBBF24',
    exercise: '#34D399',
    rest: '#38BDF8',
    selectedBg: '#14301F',
    primarySoft: '#0F2418',
    accentSoft: '#16230D',
    statusBar: 'light',
  },
  // 크림/버터 라이트
  butter: {
    bg: '#FBF6EA',
    bgElev: '#FFFDF5',
    card: '#FFFCF2',
    card2: '#F5EDDB',
    elevated: '#EDE3CC',
    inputBg: '#F2EBD8',
    text: '#2B2416',
    sub: '#6E6350',
    faint: '#A2967E',
    border: 'rgba(90,70,20,0.13)',
    hairline: 'rgba(90,70,20,0.07)',
    primary: '#D9A400',
    primaryDark: '#B78600',
    onPrimary: '#241C05',
    accent: '#0D9488',
    onAccent: '#FFFFFF',
    danger: '#DC2626',
    warn: '#C2410C',
    exercise: '#CA8A04',
    rest: '#0369A1',
    selectedBg: '#F1E3B8',
    primarySoft: '#F7EDCB',
    accentSoft: '#E0F0EC',
    statusBar: 'dark',
  },
};

// 설정 화면 테마 선택용 메타
export const THEME_META: { key: ThemeName; label: string; emoji: string }[] = [
  { key: 'black', label: '블랙', emoji: '🖤' },
  { key: 'white', label: '화이트', emoji: '🤍' },
  { key: 'metal', label: '메탈', emoji: '⚙️' },
  { key: 'green', label: '그린', emoji: '💚' },
  { key: 'butter', label: '버터', emoji: '🧈' },
];

let currentTheme: ThemeName = 'black';
export function getCurrentTheme(): ThemeName {
  return currentTheme;
}

/** 테마 적용 — colors/font를 제자리에서 갱신 (앱 로드 전에 호출해야 StyleSheet에 반영) */
export function applyTheme(name: ThemeName) {
  const t = THEMES[name] ?? THEMES.black;
  currentTheme = THEMES[name] ? name : 'black';
  Object.assign(colors, t);
  // font는 모듈 평가 시점의 색을 캡처하므로 함께 갱신
  font.display.color = colors.text;
  font.h1.color = colors.text;
  font.h2.color = colors.text;
  font.h3.color = colors.text;
  font.body.color = colors.text;
  font.label.color = colors.sub;
  font.caption.color = colors.sub;
  font.overline.color = colors.sub;
}

export const colors: ThemeColors = { ...THEMES.black };

// 운동 부위별 색 (점/마커/태그용 카테고리 팔레트)
export const bodyPartColor: Record<BodyPart, string> = {
  가슴: '#FF7A7A',
  등: '#5AA9FF',
  하체: '#FFC24B',
  어깨: '#C08BFF',
  팔: '#2DD4BF',
  복근: '#FF8AD8',
  유산소: '#36D6E7',
  기타: '#9AA6B8',
};

// ── 간격 / 라운드 ────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

// ── 타이포 ────────────────────────────────────────────
export const font: Record<string, TextStyle> = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8, color: colors.text },
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  h2: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, color: colors.text },
  h3: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, color: colors.text },
  body: { fontSize: 15, fontWeight: '500', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.sub },
  caption: { fontSize: 12, fontWeight: '600', color: colors.sub },
  // 라벨 강조용(작은 대문자 느낌)
  overline: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.sub },
};

// ── 그림자(부유 요소용) ──────────────────────────────
export const shadow: ViewStyle = {
  shadowColor: '#000',
  shadowOpacity: 0.45,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 10,
};

export const softShadow: ViewStyle = {
  shadowColor: '#000',
  shadowOpacity: 0.3,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 5,
};
