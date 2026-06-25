import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors, font } from '../theme';

export interface ChartPoint {
  ts: number; // x (타임스탬프)
  value: number; // y
}

/**
 * 간단한 SVG 라인 차트. 신체 기록 / 운동별 진행 그래프에 공용으로 사용.
 */
export default function LineChart({
  data,
  height = 160,
  color = colors.primary,
  unit = '',
  emptyText = '데이터가 부족해요',
}: {
  data: ChartPoint[];
  height?: number;
  color?: string;
  unit?: string;
  emptyText?: string;
}) {
  // 측정용 고정 viewBox (반응형: preserveAspectRatio none 으로 가로 늘림)
  const W = 320;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 14;
  const padB = 16;

  if (data.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={{ color: colors.faint, fontSize: 13 }}>{emptyText}</Text>
      </View>
    );
  }

  const xs = data.map((d) => d.ts);
  const ys = data.map((d) => d.value);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const px = (x: number) => padL + ((x - minX) / spanX) * (W - padL - padR);
  const py = (y: number) => padT + (1 - (y - minY) / spanY) * (H - padT - padB);

  const pts = data.map((d) => ({ x: px(d.ts), y: py(d.value) }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const last = data[data.length - 1].value;
  const first = data[0].value;
  const delta = Math.round((last - first) * 10) / 10;

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.current}>
          {last}
          {unit}
        </Text>
        {delta !== 0 && (
          <Text style={[styles.delta, { color: delta > 0 ? colors.accent : colors.danger }]}>
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
            {unit}
          </Text>
        )}
      </View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* 기준선 */}
        <Line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke={colors.hairline} strokeWidth={1} />
        <Line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke={colors.hairline} strokeWidth={1} />
        {/* 라인 */}
        <Path d={path} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {/* 점 */}
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} fill={color} />
        ))}
      </Svg>
      <View style={styles.axisRow}>
        <Text style={styles.axisText}>{fmtShort(minX)}</Text>
        <Text style={styles.axisText}>
          최저 {minY}{unit} · 최고 {maxY}{unit}
        </Text>
        <Text style={styles.axisText}>{fmtShort(maxX)}</Text>
      </View>
    </View>
  );
}

function fmtShort(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 6 },
  current: { ...font.h2, color: colors.text },
  delta: { fontSize: 13, fontWeight: '800' },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisText: { color: colors.faint, fontSize: 11 },
});
