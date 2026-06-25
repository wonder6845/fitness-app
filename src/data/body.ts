export type BodyUnitType = 'weight' | 'percent' | 'length';

export interface BodyMetric {
  key: string;
  label: string;
  unitType: BodyUnitType;
  color: string;
}

export const BODY_METRICS: BodyMetric[] = [
  { key: 'weight', label: '체중', unitType: 'weight', color: '#CBFB45' },
  { key: 'bodyfat', label: '체지방률', unitType: 'percent', color: '#FF7A7A' },
  { key: 'waist', label: '허리', unitType: 'length', color: '#FFC24B' },
  { key: 'chest', label: '가슴', unitType: 'length', color: '#5AA9FF' },
  { key: 'arm', label: '팔', unitType: 'length', color: '#2DD4BF' },
  { key: 'thigh', label: '허벅지', unitType: 'length', color: '#C08BFF' },
];

/** 표시 단위 (체중은 kg/lb 설정 따름) */
export function bodyUnit(unitType: BodyUnitType, weightUnit: string): string {
  if (unitType === 'weight') return weightUnit;
  if (unitType === 'percent') return '%';
  return 'cm';
}
