export type BodyUnitType = 'weight' | 'percent' | 'length';

export interface BodyMetric {
  key: string;
  label: string;
  unitType: BodyUnitType;
  color: string;
}

// 인바디 지수 — 체중·체지방률·골격근량·키 (BMI는 키·체중으로 자동 계산)
export const BODY_METRICS: BodyMetric[] = [
  { key: 'weight', label: '체중', unitType: 'weight', color: '#CBFB45' },
  { key: 'bodyfat', label: '체지방률', unitType: 'percent', color: '#FF7A7A' },
  { key: 'muscle', label: '골격근량', unitType: 'weight', color: '#2DD4BF' },
  { key: 'height', label: '키', unitType: 'length', color: '#5AA9FF' },
];

/** 표시 단위 (체중·골격근량은 kg/lb 설정 따름, 키는 cm) */
export function bodyUnit(unitType: BodyUnitType, weightUnit: string): string {
  if (unitType === 'weight') return weightUnit;
  if (unitType === 'percent') return '%';
  return 'cm';
}

/** kg 환산 (BMI 계산용). lb 설정이면 kg로 변환 */
export function toKg(value: number, weightUnit: string): number {
  return weightUnit === 'lb' ? value * 0.45359237 : value;
}

/** BMI 분류 (대한비만학회 아시아 기준) */
export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: '저체중', color: '#5AA9FF' };
  if (bmi < 23) return { label: '정상', color: '#CBFB45' };
  if (bmi < 25) return { label: '과체중', color: '#FFC24B' };
  if (bmi < 30) return { label: '비만', color: '#FF8A5B' };
  return { label: '고도비만', color: '#FF7A7A' };
}
