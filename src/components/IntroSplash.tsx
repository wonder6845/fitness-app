import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/**
 * 앱 기동 스플래시 애니메이션.
 * 아이콘 팝 → 타이틀 페이드업 + 라임 라인 → 잠시 유지 → 전체 페이드아웃.
 * rAF 기반 Animated 대신 setInterval 트윈을 사용해 웹/네이티브 어디서든 동일하게 동작.
 */
const TOTAL_MS = 1900;

// 0~1 구간 진행률
const seg = (p: number, a: number, b: number) =>
  Math.max(0, Math.min(1, (p - a) / (b - a)));
const backOut = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const cubicOut = (x: number) => 1 - Math.pow(1 - x, 3);

export default function IntroSplash({ onDone }: { onDone: () => void }) {
  const [t, setT] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / TOTAL_MS);
      setT(p);
      if (p >= 1 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(id);
        onDone();
      }
    }, 30);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 타임라인: 아이콘(0~0.24) → 타이틀(0.22~0.44)·라인(0.26~0.5) → 유지 → 페이드아웃(0.78~1)
  const iconP = backOut(seg(t, 0, 0.24));
  const titleP = cubicOut(seg(t, 0.22, 0.44));
  const barP = cubicOut(seg(t, 0.26, 0.5));
  const fade = seg(t, 0.78, 1);
  const overlayOpacity = 1 - fade * fade; // easeIn 페이드아웃

  return (
    <View style={[styles.overlay, { opacity: overlayOpacity }]}>
      <View
        style={[
          styles.iconWrap,
          {
            opacity: Math.min(1, iconP),
            transform: [{ scale: 0.5 + 0.5 * iconP }],
          },
        ]}
      >
        <Ionicons name="barbell" size={44} color={colors.onPrimary} />
      </View>

      <View
        style={{
          alignItems: 'center',
          opacity: Math.min(1, titleP),
          transform: [{ translateY: 14 * (1 - titleP) }],
        }}
      >
        <Text style={styles.overline}>FITNESS TRACKER</Text>
        <Text style={styles.title}>오늘도 화이팅 💪</Text>
      </View>

      <View
        style={[
          styles.bar,
          {
            opacity: Math.min(1, barP),
            transform: [{ scaleX: Math.max(0.05, barP) }],
          },
        ]}
      />
      <View style={styles.bottomSpace} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  overline: {
    color: colors.sub,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  bar: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 18,
  },
  bottomSpace: { height: 40 },
});
