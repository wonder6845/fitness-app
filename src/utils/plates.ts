export interface PlateStack {
  plate: number;
  count: number;
}

export interface PlateResult {
  perSide: PlateStack[];
  perSideWeight: number; // 한쪽에 올려야 할 무게
  leftover: number; // 보유 원판으로 못 맞춘 잔여(한쪽)
}

/** 단위별 기본 바 무게 */
export function defaultBar(unit: string): number {
  return unit === 'lb' ? 45 : 20;
}

/** 단위별 기본 보유 원판(한쪽 기준 종류) */
export function defaultPlates(unit: string): number[] {
  return unit === 'lb'
    ? [45, 35, 25, 10, 5, 2.5]
    : [25, 20, 15, 10, 5, 2.5, 1.25];
}

// 올림픽/IPF 표준 원판 색상
const KG_COLORS: Record<number, string> = {
  25: '#D7322A', // 빨강
  20: '#2C68D8', // 파랑
  15: '#E6B12E', // 노랑
  10: '#34A853', // 초록
  5: '#ECEDF0', // 흰색
  2.5: '#C0392B',
  1.25: '#7A7F8C',
  0.5: '#9AA6B8',
};
const LB_COLORS: Record<number, string> = {
  45: '#2C68D8',
  35: '#E6B12E',
  25: '#34A853',
  10: '#ECEDF0',
  5: '#C0392B',
  2.5: '#7A7F8C',
};

export function plateColor(plate: number, unit: string): string {
  const map = unit === 'lb' ? LB_COLORS : KG_COLORS;
  return map[plate] ?? '#8A93A6';
}

/** 밝은(흰색) 원판인지 → 글자/테두리 대비용 */
export function isLightPlate(plate: number, unit: string): boolean {
  return plateColor(plate, unit) === '#ECEDF0';
}

/** 그림 크기 기준(가장 무거운 흔한 원판) */
export function plateSizeRef(unit: string): number {
  return unit === 'lb' ? 45 : 25;
}

/** 목표 중량을 바 + 한쪽 원판 구성으로 분해 (그리디) */
export function computePlates(
  target: number,
  bar: number,
  plates: number[]
): PlateResult {
  const perSideWeight = Math.max(0, Math.round(((target - bar) / 2) * 1000) / 1000);
  const perSide: PlateStack[] = [];
  let remaining = perSideWeight;
  const sorted = [...plates].sort((a, b) => b - a);
  for (const p of sorted) {
    const count = Math.floor(remaining / p + 1e-9);
    if (count > 0) {
      perSide.push({ plate: p, count });
      remaining = Math.round((remaining - p * count) * 1000) / 1000;
    }
  }
  return { perSide, perSideWeight, leftover: remaining };
}
