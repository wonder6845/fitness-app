import { Platform } from 'react-native';

// Apple Watch / HealthKit 연동.
// - 실제 동작: iOS dev build + react-native-health 설치 + Apple Watch 착용 시
// - 웹/Expo Go/Android: 사용 불가로 감지되어 심박 UI가 자동으로 숨겨진다.
// - 개발/데모: globalThis.__fitHealthMock = { avgHr: 142, distanceKm: 1.5 } 로 모의 동작 가능.

export interface CardioHealthStats {
  avgHr: number | null; // 평균 심박(bpm)
  distanceKm: number | null; // 이동 거리(km)
}

let Health: unknown = null;
if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Health = require('react-native-health').default;
  } catch {
    Health = null; // 미설치(Expo Go 등) → 기능 비활성
  }
}

type MockHealth = { avgHr?: number; distanceKm?: number };
function mock(): MockHealth | null {
  const m = (globalThis as { __fitHealthMock?: MockHealth }).__fitHealthMock;
  return m ?? null;
}

/** 심박/거리 자동 기록을 쓸 수 있는 환경인지 (Apple Watch·HealthKit) */
export function isHealthAvailable(): boolean {
  return !!Health || !!mock();
}

let authorized = false;

async function ensurePermission(): Promise<boolean> {
  if (mock()) return true;
  const H = Health as {
    Constants: { Permissions: Record<string, string> };
    initHealthKit: (perms: unknown, cb: (err: string) => void) => void;
  } | null;
  if (!H) return false;
  if (authorized) return true;
  const perms = {
    permissions: {
      read: [
        H.Constants.Permissions.HeartRate,
        H.Constants.Permissions.DistanceWalkingRunning,
      ],
    },
  };
  return new Promise((resolve) => {
    H.initHealthKit(perms, (err: string) => {
      authorized = !err;
      resolve(authorized);
    });
  });
}

/** 운동 구간(시작~끝)의 평균 심박·거리 조회 — 워치/아이폰이 기록한 값을 읽음 */
export async function getCardioStats(
  startMs: number,
  endMs: number
): Promise<CardioHealthStats> {
  const m = mock();
  if (m) return { avgHr: m.avgHr ?? null, distanceKm: m.distanceKm ?? null };

  const H = Health as {
    getHeartRateSamples: (
      opts: unknown,
      cb: (err: string, rs: { value: number }[]) => void
    ) => void;
    getSamples: (
      opts: unknown,
      cb: (err: string, rs: { quantity?: number; value?: number }[]) => void
    ) => void;
  } | null;
  if (!H) return { avgHr: null, distanceKm: null };
  const ok = await ensurePermission();
  if (!ok) return { avgHr: null, distanceKm: null };

  const range = {
    startDate: new Date(startMs).toISOString(),
    endDate: new Date(endMs).toISOString(),
  };

  const avgHr = await new Promise<number | null>((resolve) => {
    try {
      H.getHeartRateSamples(range, (err, rs) => {
        if (err || !rs?.length) return resolve(null);
        resolve(Math.round(rs.reduce((s, r) => s + r.value, 0) / rs.length));
      });
    } catch {
      resolve(null);
    }
  });

  // 거리 샘플(m) 합산 → km (라이브러리/OS 버전에 따라 필드가 달라 방어적으로 처리)
  const distanceKm = await new Promise<number | null>((resolve) => {
    try {
      H.getSamples({ ...range, type: 'DistanceWalkingRunning' }, (err, rs) => {
        if (err || !rs?.length) return resolve(null);
        const meters = rs.reduce((s, r) => s + (r.quantity ?? r.value ?? 0), 0);
        resolve(meters > 0 ? Math.round((meters / 1000) * 100) / 100 : null);
      });
    } catch {
      resolve(null);
    }
  });

  return { avgHr, distanceKm };
}
