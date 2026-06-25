import { TextStyle, ViewStyle } from 'react-native';
import { BodyPart } from './types';

// ── 색상 ──────────────────────────────────────────────
// 다크 차콜 + 라임 시그니처 액센트 (애슬레저/퍼포먼스 무드)
export const colors = {
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

  // 브랜드 / CTA / 활성
  primary: '#CBFB45', // 라임
  primaryDark: '#A6E22E',
  onPrimary: '#0A0B0F', // 라임 위 텍스트(어둡게)

  // 보조 강조 / 성공 / 시작
  accent: '#2DD4BF', // 틸
  onAccent: '#05221E',

  danger: '#FF5D5D',
  warn: '#FFB020',

  // 운동 진행 단계 색
  exercise: '#CBFB45', // 운동 중 = 라임
  rest: '#38BDF8', // 휴식 중 = 스카이
};

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
