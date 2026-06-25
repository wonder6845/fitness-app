// Apple Health(HealthKit) 연동 모듈 — iOS dev build 전용.
// src/integrations/healthkit.ts 로 옮겨 사용하세요.
// 웹/Android/Expo Go 에서는 모든 함수가 안전하게 no-op 입니다.
//
// 필요한 패키지:  npx expo install react-native-health
// 권한 문자열은 app.json 의 ios.infoPlist 에 설정 (README 2단계 참고).

import { Platform } from 'react-native';
import type { WorkoutSession } from '../types'; // 실제 경로에 맞게 조정

// iOS 가 아니면 라이브러리를 아예 require 하지 않는다(번들/실행 안전).
let Health: any = null;
if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Health = require('react-native-health').default;
  } catch {
    Health = null;
  }
}

const PERMS = Health
  ? {
      permissions: {
        read: [
          Health.Constants.Permissions.HeartRate,
          Health.Constants.Permissions.ActiveEnergyBurned,
          Health.Constants.Permissions.Workout,
        ],
        write: [
          Health.Constants.Permissions.Workout,
          Health.Constants.Permissions.ActiveEnergyBurned,
        ],
      },
    }
  : null;

let authorized = false;

/** HealthKit 권한 요청 (앱/설정에서 1회 호출) */
export function requestHealthPermission(): Promise<boolean> {
  if (!Health || !PERMS) return Promise.resolve(false);
  return new Promise((resolve) => {
    Health.initHealthKit(PERMS, (err: string) => {
      authorized = !err;
      resolve(authorized);
    });
  });
}

/** 완료한 운동 세션을 건강 앱에 저장 (운동 종류: 기능성 근력 트레이닝) */
export function saveWorkoutToHealth(session: WorkoutSession): Promise<void> {
  if (!Health) return Promise.resolve();
  const opts = {
    type: 'FunctionalStrengthTraining',
    startDate: new Date(session.startedAt).toISOString(),
    endDate: new Date(session.endedAt).toISOString(),
    energyBurned: estimateKcal(session),
    energyBurnedUnit: 'kilocalorie',
  };
  return new Promise((resolve) => {
    Health.saveWorkout(opts, () => resolve());
  });
}

/** 운동 시간대의 평균 심박수 조회 (워치가 기록한 값을 읽어옴) */
export function getAvgHeartRate(startedAt: number, endedAt: number): Promise<number | null> {
  if (!Health) return Promise.resolve(null);
  return new Promise((resolve) => {
    Health.getHeartRateSamples(
      { startDate: new Date(startedAt).toISOString(), endDate: new Date(endedAt).toISOString() },
      (err: string, results: { value: number }[]) => {
        if (err || !results?.length) return resolve(null);
        const avg = results.reduce((s, r) => s + r.value, 0) / results.length;
        resolve(Math.round(avg));
      }
    );
  });
}

// 볼륨 기반의 아주 단순한 칼로리 추정(정확한 값은 워치 심박 기반이 더 정확)
function estimateKcal(session: WorkoutSession): number {
  const minutes = Math.max(1, session.durationSec / 60);
  return Math.round(minutes * 6); // 대략 분당 ~6kcal 가정
}

export function isHealthAvailable(): boolean {
  return !!Health;
}
