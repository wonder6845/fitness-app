import { RoutineExercise } from '../types';

export type StepType = 'ready' | 'exercise' | 'rest';

/** 타이머가 순서대로 진행하는 단일 단계 */
export interface Step {
  type: StepType;
  exIndex: number; // records / exercises 배열 인덱스
  setNo: number; // 1-based 세트(라운드) 번호
  duration: number; // 초
}

/**
 * 루틴 구성으로부터 평탄화된 단계 시퀀스를 생성한다.
 *
 * 일반 운동: [준비] → [운동] → [휴식]  (마지막 세트 뒤 휴식 생략)
 * 슈퍼셋(supersetGroup 이 같은 연속 운동): 라운드마다 묶인 운동을 번갈아 진행하고,
 *   라운드 사이에만 휴식을 둔다. 예) A1 → B1 → 휴식 → A2 → B2 → 휴식 → A3 → B3
 * readySec 가 0이면 준비 단계를 넣지 않는다.
 */
export function buildSteps(
  exercises: RoutineExercise[],
  readySec = 0
): Step[] {
  const steps: Step[] = [];

  const pushReadyAndExercise = (exIndex: number, setNo: number, ex: RoutineExercise) => {
    if (readySec > 0) {
      steps.push({ type: 'ready', exIndex, setNo, duration: readySec });
    }
    steps.push({
      type: 'exercise',
      exIndex,
      setNo,
      duration: Math.max(1, ex.exerciseSec),
    });
  };

  let i = 0;
  while (i < exercises.length) {
    const group = exercises[i].supersetGroup;

    if (group) {
      // 같은 그룹의 연속 멤버 수집
      const members: number[] = [];
      let j = i;
      while (j < exercises.length && exercises[j].supersetGroup === group) {
        members.push(j);
        j += 1;
      }
      const rounds = Math.max(...members.map((m) => Math.max(1, exercises[m].totalSets)));
      for (let r = 1; r <= rounds; r++) {
        for (const m of members) {
          if (r > Math.max(1, exercises[m].totalSets)) continue;
          pushReadyAndExercise(m, r, exercises[m]);
        }
        if (r < rounds) {
          // 라운드 사이 휴식 (그룹 첫 운동의 휴식 시간 사용)
          steps.push({
            type: 'rest',
            exIndex: members[0],
            setNo: r,
            duration: Math.max(0, exercises[members[0]].restSec),
          });
        }
      }
      i = j;
    } else {
      const ex = exercises[i];
      const sets = Math.max(1, ex.totalSets);
      for (let s = 1; s <= sets; s++) {
        pushReadyAndExercise(i, s, ex);
        if (s < sets) {
          steps.push({
            type: 'rest',
            exIndex: i,
            setNo: s,
            duration: Math.max(0, ex.restSec),
          });
        }
      }
      i += 1;
    }
  }
  return steps;
}
