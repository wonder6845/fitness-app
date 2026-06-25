# 헬스 기록 앱 (Fitness Tracker)

운동 루틴을 만들고, **운동/휴식 타이머가 자동으로 세트를 진행**하며, 세트별 무게·반복 횟수를 기록하고, 달력·통계로 운동 이력을 확인하는 React Native(Expo) 앱입니다.

요구사항 명세서의 MVP 1차 범위를 모두 구현했습니다.

## 실행 방법

> ⚠️ Node.js **20.19.4 이상** 권장 (현재 20.17에서도 번들은 되지만 Expo CLI가 경고를 표시합니다)

```bash
cd fitness-app
npm install          # 최초 1회
npm start            # Expo 개발 서버 (QR 코드)
```

- **휴대폰**: Expo Go 앱 설치 후 터미널 QR 코드 스캔
- **Android 에뮬레이터**: `npm run android`
- **iOS 시뮬레이터(macOS)**: `npm run ios`
- **웹 미리보기**: `npm run web`

타입 검사: `npx tsc --noEmit`

## 구현된 기능 (MVP)

| 영역 | 내용 |
|---|---|
| 루틴 관리 | 생성/저장/수정/삭제, 운동 순서 변경, 세트·운동시간·휴식시간 설정 |
| 운동 분류 | 부위(8종)·기구(6종) 필터, 기본 운동 40여 종, 커스텀 운동 추가(중복 검사) |
| 자동 타이머 | 운동→휴식→다음 세트 자동 전환, 일시정지/재개, 세트 건너뛰기, ±15초, 진동 알림, 화면 켜짐 유지 |
| 세트 기록 | 세트별 무게/반복 입력, 이전 기록 placeholder, 완료 체크, 세트 추가/삭제, 운동 메모 |
| 세션 저장 | 루틴 스냅샷 보존, 완료/부분완료 구분, 총 볼륨·소요시간 요약 |
| 임시 저장·복구 | 진행 중 자동 저장(draft), 앱 재실행 시 이어하기/저장/삭제 복구 배너 |
| 달력 | 부위별 색상 마커, 날짜별 세션 목록(하루 여러 세션 지원), 세션 상세 수정/삭제 |
| 통계 | 주간 빈도(8주), 부위별 세트 분포(30일), 운동별 최고 무게(PR) |
| 설정 | kg/lb 단위, 진동·카운트다운·화면유지 토글, 커스텀 운동 관리, 전체 초기화 |

## 명세서 엣지 케이스 대응

- **타이머 일시정지**: 남은 시간 보존(wall-clock 무시), 재개 시 이어서 진행 → `WorkoutScreen.togglePause`
- **세트 건너뛰기**: `skipped` 플래그 기록, 통계 완료 세트에서 제외 → `gotoNext('skip')`
- **루틴 중간 종료**: "지금까지 기록 저장" 확인 후 부분 완료(`partial`) 세션 저장 → `confirmEnd` / `computeStatus`
- **저장 전 앱 종료**: 입력마다 draft 자동 저장, 재실행 시 복구 배너 → `saveDraft` / `HomeScreen` 배너
- **하루 여러 세션**: 날짜가 아닌 `sessionId` 단위 저장, 달력에서 리스트로 표시
- **운동명 중복**: 정규화 후 기본/커스텀 중복 검사, 안내 메시지 → `addCustomExercise`
- **루틴 스냅샷**: 세션 저장 시 루틴 구성을 복사 → 이후 루틴 수정에도 과거 기록 불변

## 프로젝트 구조

```
App.tsx                      # 네비게이션(탭 + 스택), 테마, Provider
src/
  types.ts                   # 데이터 모델 (명세서 9장과 1:1)
  theme.ts                   # 다크 테마 색상 / 부위별 색
  navigation.ts              # 네비게이션 파라미터 타입
  data/exercises.ts          # 기본 운동 DB, 부위/기구 목록
  storage/db.ts              # AsyncStorage 영속화 계층
  store/AppContext.tsx       # 전역 상태(루틴/세션/설정/draft/편집버퍼)
  utils/helpers.ts           # id, 날짜/시간 포맷, 볼륨 계산
  workout/
    steps.ts                 # 루틴 → 타이머 단계 시퀀스 생성
    session.ts               # 기록 초기화, 상태 판정, 세션 빌드
  components/ui.tsx          # 공통 UI(Card/Btn/Pill 등)
  screens/
    HomeScreen.tsx           # 홈(빠른 시작 + 복구 배너 + 요약)
    RoutinesScreen.tsx       # 루틴 목록
    RoutineEditScreen.tsx    # 루틴 생성/편집
    ExercisePickerScreen.tsx # 운동 선택/커스텀 추가
    WorkoutScreen.tsx        # ⭐ 자동 타이머 + 세트 기록 (핵심)
    CalendarScreen.tsx       # 달력 + 날짜별 기록
    SessionDetailScreen.tsx  # 세션 상세/수정/삭제
    StatsScreen.tsx          # 통계
    SettingsScreen.tsx       # 설정
```

## 타이머 동작 핵심

`endTimestamp`(종료 예정 시각)를 기준으로 매 틱마다 `남은시간 = endTimestamp - now`를 계산합니다. `setInterval` 누적 오차가 없고, 백그라운드 복귀 시에도 경과한 단계를 자동으로 따라잡습니다. (`WorkoutScreen.tick`)

## 데이터 저장

모든 데이터는 기기 로컬(AsyncStorage)에 저장됩니다. 서버/계정 없이 동작하는 오프라인 앱입니다.
