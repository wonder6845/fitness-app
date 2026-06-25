# Apple Watch + Apple Health 연동 가이드

> ⚠️ 이 폴더의 코드는 **이 저장소의 웹/Expo Go 앱에 자동으로 포함되지 않습니다.**
> Metro 번들과 분리되어 있고, tsconfig에서도 제외됩니다. 실제로 켜려면 아래 절차대로
> **dev build(개발 빌드)** 를 만들어야 하며, **Mac + Xcode 또는 EAS Build**, 실제 **iPhone + Apple Watch**,
> **Apple Developer 계정(연 $99)** 이 필요합니다. Windows에서는 EAS Build(클라우드)로 빌드는 가능하지만
> watchOS 타깃 추가/서명은 Xcode가 사실상 필요합니다.

## 구성 요소

| 부분 | 위치 | 역할 |
|---|---|---|
| HealthKit 모듈 | `rn/healthkit.ts` | 운동 완료 시 건강 앱에 운동 저장 / 심박·칼로리 읽기 |
| Watch 브리지(폰 측) | `rn/watchBridge.ts` | 워치로 타이머 상태 전송, 워치 명령(일시정지/다음) 수신 |
| watchOS 앱 | `watch/*.swift` | 손목에서 타이머·세트 표시 + Pause/Next 버튼 |

**데이터 흐름**

```
[iPhone 앱(React Native)]  ──applicationContext/message──▶  [Apple Watch 앱(SwiftUI)]
   타이머 주체                                                   원격 표시
        ▲                                                          │
        └──────────────  command(next/pause)  ◀────────────────────┘

[iPhone 앱]  ──saveWorkout──▶  [Apple Health]  ◀──심박/칼로리──  [Apple Watch 센서]
```

---

## 1단계 — 네이티브 dev build로 전환

Expo 관리형(JS 전용)에서는 HealthKit/WatchConnectivity/watchOS 타깃을 쓸 수 없습니다.

```bash
# 네이티브 프로젝트 생성(ios/ 폴더 생김). 이후엔 dev build로 실행.
npx expo prebuild -p ios

# 라이브러리 설치
npx expo install react-native-health react-native-watch-connectivity
```

`react-native-health`는 HealthKit, `react-native-watch-connectivity`는 폰↔워치 통신을 담당합니다.

## 2단계 — app.json에 HealthKit 권한/플러그인 추가

```jsonc
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSHealthShareUsageDescription": "심박수·칼로리를 불러와 운동 기록에 반영합니다.",
        "NSHealthUpdateUsageDescription": "완료한 운동을 건강 앱에 저장합니다."
      },
      "entitlements": {
        "com.apple.developer.healthkit": true
      }
    },
    "plugins": [
      ["react-native-health", { "isClinicalDataEnabled": false }]
    ]
  }
}
```

## 3단계 — RN 코드 연결

`rn/healthkit.ts`, `rn/watchBridge.ts`를 `src/integrations/`로 옮긴 뒤:

- **세션 저장 시 건강 앱에 기록** — `src/screens/WorkoutScreen.tsx`의 `saveAndExit()` 끝에:
  ```ts
  import { saveWorkoutToHealth } from '../integrations/healthkit';
  // ...
  saveWorkoutToHealth(session).catch(() => {});
  ```
- **타이머 상태를 워치로 전송** — `WorkoutScreen`의 표시 파생값이 바뀔 때:
  ```ts
  import { sendToWatch } from '../integrations/watchBridge';
  useEffect(() => {
    sendToWatch({
      phase: phaseLabel, remainingSec: Math.round(remainingMs / 1000),
      setNo: curStep?.setNo ?? 0, totalSets: curEx?.sets.length ?? 0,
      exercise: curEx?.exerciseName ?? '', running,
    });
  }, [phaseLabel, remainingMs, curStep, curEx, running]);
  ```
- **워치 명령 수신** — 화면 진입 시 구독:
  ```ts
  import { subscribeWatchCommands } from '../integrations/watchBridge';
  useEffect(() => subscribeWatchCommands((cmd) => {
    if (cmd === 'pause') togglePause();
    if (cmd === 'next') gotoNext('complete');
  }), []);
  ```
- 앱 시작 시 권한 요청(예: 설정 화면 토글):
  ```ts
  import { requestHealthPermission } from '../integrations/healthkit';
  requestHealthPermission();
  ```

## 4단계 — Xcode에서 watchOS 타깃 추가

1. `ios/fitnessapp.xcworkspace`를 Xcode로 연다.
2. **File ▸ New ▸ Target… ▸ watchOS ▸ App** 선택 → 이름 `FitnessWatch`.
3. 생성된 타깃의 Swift 파일을 이 폴더 `watch/`의 내용으로 교체한다.
4. iOS 앱 타깃과 watch 타깃 **둘 다** Signing & Capabilities에서 **HealthKit** capability 추가.
5. 실제 기기(페어링된 iPhone + Apple Watch)로 Run.

## 5단계 — 테스트

- **시뮬레이터로는 HealthKit/센서 동작이 제한적**입니다. 심박수/칼로리·워치 통신은 **실기기**에서 확인하세요.
- 워치에서 타이머가 표시되고 Pause/Next가 폰에 반영되는지, 운동 종료 후 **건강 앱 ▸ 운동**에 기록이 남는지 확인합니다.

## 비용/요건 요약

- macOS + Xcode (watchOS 타깃 추가·서명에 필요)
- Apple Developer Program ($99/년, 실기기 설치·HealthKit 권한)
- 실제 iPhone + Apple Watch (시뮬레이터로는 센서/통신 검증 불가)
- EAS Build를 쓰면 Windows에서 iOS 빌드는 가능하나, watch 타깃 구성은 Xcode 권장
