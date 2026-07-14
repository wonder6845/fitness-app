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
export interface ChartOverlay {
  data: ChartPoint[]; // 겹쳐 그릴 보조 시리즈 (점선)
  color: string;
  label?: string;
}

export default function LineChart({
  data,
  height = 160,
  color = colors.primary,
  unit = '',
  emptyText = '데이터가 부족해요',
  label,
  overlay,
}: {
  data: ChartPoint[];
  height?: number;
  color?: string;
  unit?: string;
  emptyText?: string;
  label?: string; // 범례용 메인 시리즈 이름 (overlay 있을 때 표시)
  overlay?: ChartOverlay;
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

  // 스케일은 오버레이 시리즈까지 합쳐서 계산 (두 라인이 한 좌표계에 놓이도록)
  const overlayData = overlay && overlay.data.length >= 2 ? overlay.data : [];
  const all = [...data, ...overlayData];
  const xs = all.map((d) => d.ts);
  const ys = all.map((d) => d.value);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const px = (x: number) => padL + ((x - minX) / spanX) * (W - padL - padR);
  const py = (y: number) => padT + (1 - (y - minY) / spanY) * (H - padT - padB);

  const toPath = (ds: ChartPoint[]) =>
    ds
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${px(d.ts).toFixed(1)},${py(d.value).toFixed(1)}`)
      .join(' ');
  const pts = data.map((d) => ({ x: px(d.ts), y: py(d.value) }));
  const path = toPath(data);
  const overlayPath = overlayData.length >= 2 ? toPath(overlayData) : null;

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
        {/* 오버레이 라인 (점선) — 메인 라인 아래에 깔림 */}
        {overlayPath && overlay && (
          <Path
            d={overlayPath}
            stroke={overlay.color}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="6,5"
          />
        )}
        {/* 라인 */}
        <Path d={path} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {/* 점 */}
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} fill={color} />
        ))}
      </Svg>
      {/* 범례 (오버레이가 있을 때만) */}
      {overlayPath && overlay && (
        <View style={styles.legendRow}>
          <View style={[styles.legendLine, { backgroundColor: color }]} />
          <Text style={styles.legendText}>{label ?? '기록'}</Text>
          <View style={[styles.legendDash, { borderColor: overlay.color }]} />
          <Text style={styles.legendText}>{overlay.label ?? '보조'}</Text>
        </View>
      )}
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
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendDash: { width: 16, height: 0, borderTopWidth: 2, borderStyle: 'dashed' },
  legendText: { color: colors.sub, fontSize: 11, fontWeight: '700', marginRight: 8 },
});
