// 폰 ↔ 애플워치 통신 브리지 — iOS dev build 전용.
// src/integrations/watchBridge.ts 로 옮겨 사용하세요.
// 웹/Android/Expo Go 에서는 모든 함수가 안전하게 no-op 입니다.
//
// 필요한 패키지:  npx expo install react-native-watch-connectivity

import { Platform } from 'react-native';

let Watch: any = null;
if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Watch = require('react-native-watch-connectivity');
  } catch {
    Watch = null;
  }
}

export interface WatchState {
  phase: string; // '운동 중' | '휴식 중' | '일시정지' | '운동 완료'
  remainingSec: number;
  setNo: number;
  totalSets: number;
  exercise: string;
  running: boolean;
}

export type WatchCommand = 'next' | 'pause';

/**
 * 현재 타이머 상태를 워치로 전송.
 * applicationContext 는 "최신 상태"만 유지하므로 빈번한 갱신에 적합하고 배터리에 유리.
 */
export function sendToWatch(state: WatchState): void {
  if (!Watch) return;
  try {
    Watch.updateApplicationContext({
      phase: state.phase,
      remainingSec: state.remainingSec,
      setNo: state.setNo,
      totalSets: state.totalSets,
      exercise: state.exercise,
      running: state.running,
      ts: Date.now(),
    });
  } catch {
    // 워치 미연결 등 무시
  }
}

/**
 * 워치에서 보내는 명령(next/pause) 구독.
 * 반환값을 cleanup 으로 호출하면 구독 해제.
 */
export function subscribeWatchCommands(
  handler: (cmd: WatchCommand) => void
): () => void {
  if (!Watch) return () => {};
  try {
    const unsub = Watch.watchEvents.addListener(
      'message',
      (message: { command?: WatchCommand }) => {
        if (message?.command === 'next' || message?.command === 'pause') {
          handler(message.command);
        }
      }
    );
    return () => unsub();
  } catch {
    return () => {};
  }
}

export function isWatchAvailable(): boolean {
  return !!Watch;
}
