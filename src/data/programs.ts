import { BodyPart, Equipment } from '../types';

export interface ProgramExercise {
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  totalSets: number;
  exerciseSec: number;
  restSec: number;
  targetReps?: number;
  targetLabel: string; // 화면 표시용 (예: "100회", "10km", "30초")
}

export interface WorkoutProgram {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  level: string; // 난이도
  frequency: string; // 권장 빈도
  description: string;
  gradient: [string, string]; // 카드/헤더 그라데이션
  exercises: ProgramExercise[];
}

export const PROGRAMS: WorkoutProgram[] = [
  {
    id: 'prog-saitama',
    name: '사이타마 훈련법',
    subtitle: '원펀맨이 강해진 그 훈련',
    emoji: '👊',
    level: '지옥의 특훈',
    frequency: '매일 (주 7일)',
    description:
      '「팔굽혀펴기 100회, 윗몸일으키기 100회, 스쿼트 100회, 그리고 10km 달리기. 이걸 매일.」\n\n' +
      '원펀맨의 사이타마가 3년간 매일 빠짐없이 했다는 전설의 맨몸 루틴입니다. 특별한 기구는 필요 없고, 핵심은 "매일 빠지지 않는 것".\n\n' +
      '처음부터 100회가 힘들다면 횟수를 줄여서 시작하고, 조금씩 100회에 도전해보세요. 에어컨도 끄고… 는 농담입니다. 무리하지 마세요.',
    gradient: ['#f9d423', '#ff4e50'],
    exercises: [
      {
        name: '팔굽혀펴기',
        bodyPart: '가슴',
        equipment: '맨몸',
        totalSets: 1,
        exerciseSec: 150,
        restSec: 0,
        targetReps: 100,
        targetLabel: '100회',
      },
      {
        name: '윗몸일으키기',
        bodyPart: '복근',
        equipment: '맨몸',
        totalSets: 1,
        exerciseSec: 150,
        restSec: 0,
        targetReps: 100,
        targetLabel: '100회',
      },
      {
        name: '스쿼트',
        bodyPart: '하체',
        equipment: '맨몸',
        totalSets: 1,
        exerciseSec: 180,
        restSec: 0,
        targetReps: 100,
        targetLabel: '100회',
      },
      {
        name: '달리기 10km',
        bodyPart: '유산소',
        equipment: '맨몸',
        totalSets: 1,
        exerciseSec: 1800,
        restSec: 0,
        targetLabel: '10km',
      },
    ],
  },
  {
    id: 'prog-bodyweight-starter',
    name: '맨몸 전신 입문',
    subtitle: '기구 없이 시작하는 홈트',
    emoji: '🌱',
    level: '입문',
    frequency: '주 3회',
    description:
      '헬스장이나 기구 없이 집에서 할 수 있는 전신 입문 루틴입니다.\n\n' +
      '무리 없는 횟수로 구성되어 있어 운동을 처음 시작하는 분께 좋아요. 자세가 익숙해지면 세트 수나 횟수를 늘려보세요.',
    gradient: ['#11998e', '#38ef7d'],
    exercises: [
      { name: '팔굽혀펴기', bodyPart: '가슴', equipment: '맨몸', totalSets: 3, exerciseSec: 40, restSec: 60, targetReps: 10, targetLabel: '10회 × 3' },
      { name: '맨몸 스쿼트', bodyPart: '하체', equipment: '맨몸', totalSets: 3, exerciseSec: 45, restSec: 60, targetReps: 15, targetLabel: '15회 × 3' },
      { name: '플랭크', bodyPart: '복근', equipment: '맨몸', totalSets: 3, exerciseSec: 30, restSec: 45, targetLabel: '30초 × 3' },
      { name: '크런치', bodyPart: '복근', equipment: '맨몸', totalSets: 3, exerciseSec: 40, restSec: 45, targetReps: 20, targetLabel: '20회 × 3' },
    ],
  },
  {
    id: 'prog-core-burner',
    name: '코어 집중 10분',
    subtitle: '짧고 굵은 복근 루틴',
    emoji: '🔥',
    level: '중급',
    frequency: '주 4회',
    description:
      '10분 안에 코어를 자극하는 짧고 강한 루틴입니다.\n\n' +
      '휴식을 짧게 가져가 강도를 높였어요. 세트 사이 호흡을 정리하며 따라오세요.',
    gradient: ['#fc466b', '#3f5efb'],
    exercises: [
      { name: '플랭크', bodyPart: '복근', equipment: '맨몸', totalSets: 3, exerciseSec: 45, restSec: 30, targetLabel: '45초 × 3' },
      { name: '크런치', bodyPart: '복근', equipment: '맨몸', totalSets: 3, exerciseSec: 40, restSec: 30, targetReps: 25, targetLabel: '25회 × 3' },
      { name: '행잉 레그 레이즈', bodyPart: '복근', equipment: '맨몸', totalSets: 3, exerciseSec: 40, restSec: 30, targetReps: 15, targetLabel: '15회 × 3' },
    ],
  },
  {
    id: 'prog-5x5',
    name: '스트롱리프트 5×5',
    subtitle: '바벨 기초 근력의 정석',
    emoji: '🏋️',
    level: '초·중급',
    frequency: '주 3회 (격일)',
    description:
      '가장 유명한 바벨 근력 프로그램입니다. 적은 종목을 무겁게 5세트 5회 반복하며 기초 근력과 자세를 다집니다.\n\n' +
      '세트 사이 휴식을 충분히(약 3분) 가져가고, 매 운동마다 조금씩 무게를 올리는 것이 핵심입니다.',
    gradient: ['#283048', '#859398'],
    exercises: [
      { name: '스쿼트', bodyPart: '하체', equipment: '바벨', totalSets: 5, exerciseSec: 40, restSec: 180, targetReps: 5, targetLabel: '5회 × 5' },
      { name: '벤치프레스', bodyPart: '가슴', equipment: '바벨', totalSets: 5, exerciseSec: 40, restSec: 180, targetReps: 5, targetLabel: '5회 × 5' },
      { name: '바벨 로우', bodyPart: '등', equipment: '바벨', totalSets: 5, exerciseSec: 40, restSec: 180, targetReps: 5, targetLabel: '5회 × 5' },
    ],
  },
  {
    id: 'prog-ppl-push',
    name: '푸시 데이',
    subtitle: 'PPL · 가슴·어깨·삼두',
    emoji: '💥',
    level: '중급',
    frequency: '주 1~2회',
    description:
      'PPL(푸시·풀·레그) 분할의 "미는 날"입니다. 가슴·어깨·삼두를 함께 단련합니다.\n\n' +
      '복합 운동을 먼저, 고립 운동을 나중에 배치했습니다.',
    gradient: ['#ff512f', '#dd2476'],
    exercises: [
      { name: '벤치프레스', bodyPart: '가슴', equipment: '바벨', totalSets: 4, exerciseSec: 40, restSec: 120, targetReps: 8, targetLabel: '8회 × 4' },
      { name: '오버헤드 프레스', bodyPart: '어깨', equipment: '바벨', totalSets: 3, exerciseSec: 40, restSec: 90, targetReps: 10, targetLabel: '10회 × 3' },
      { name: '인클라인 벤치프레스', bodyPart: '가슴', equipment: '바벨', totalSets: 3, exerciseSec: 40, restSec: 90, targetReps: 10, targetLabel: '10회 × 3' },
      { name: '사이드 레터럴 레이즈', bodyPart: '어깨', equipment: '덤벨', totalSets: 3, exerciseSec: 35, restSec: 60, targetReps: 15, targetLabel: '15회 × 3' },
      { name: '트라이셉스 푸시다운', bodyPart: '팔', equipment: '케이블', totalSets: 3, exerciseSec: 35, restSec: 60, targetReps: 12, targetLabel: '12회 × 3' },
    ],
  },
  {
    id: 'prog-ppl-pull',
    name: '풀 데이',
    subtitle: 'PPL · 등·이두',
    emoji: '🪝',
    level: '중급',
    frequency: '주 1~2회',
    description: 'PPL 분할의 "당기는 날"입니다. 등과 이두를 집중적으로 단련합니다.',
    gradient: ['#2193b0', '#6dd5ed'],
    exercises: [
      { name: '데드리프트', bodyPart: '등', equipment: '바벨', totalSets: 3, exerciseSec: 40, restSec: 180, targetReps: 5, targetLabel: '5회 × 3' },
      { name: '풀업', bodyPart: '등', equipment: '맨몸', totalSets: 4, exerciseSec: 40, restSec: 90, targetReps: 8, targetLabel: '8회 × 4' },
      { name: '시티드 케이블 로우', bodyPart: '등', equipment: '케이블', totalSets: 3, exerciseSec: 40, restSec: 75, targetReps: 10, targetLabel: '10회 × 3' },
      { name: '바벨 컬', bodyPart: '팔', equipment: '바벨', totalSets: 3, exerciseSec: 35, restSec: 60, targetReps: 12, targetLabel: '12회 × 3' },
      { name: '해머 컬', bodyPart: '팔', equipment: '덤벨', totalSets: 3, exerciseSec: 35, restSec: 60, targetReps: 12, targetLabel: '12회 × 3' },
    ],
  },
  {
    id: 'prog-ppl-legs',
    name: '레그 데이',
    subtitle: 'PPL · 하체 집중',
    emoji: '🦵',
    level: '중급',
    frequency: '주 1~2회',
    description: 'PPL 분할의 "하체 날"입니다. 다리 전체를 강하게 단련합니다.',
    gradient: ['#8E2DE2', '#4A00E0'],
    exercises: [
      { name: '스쿼트', bodyPart: '하체', equipment: '바벨', totalSets: 4, exerciseSec: 40, restSec: 150, targetReps: 8, targetLabel: '8회 × 4' },
      { name: '레그 프레스', bodyPart: '하체', equipment: '머신', totalSets: 3, exerciseSec: 40, restSec: 90, targetReps: 12, targetLabel: '12회 × 3' },
      { name: '루마니안 데드리프트', bodyPart: '하체', equipment: '바벨', totalSets: 3, exerciseSec: 40, restSec: 90, targetReps: 10, targetLabel: '10회 × 3' },
      { name: '레그 컬', bodyPart: '하체', equipment: '머신', totalSets: 3, exerciseSec: 35, restSec: 60, targetReps: 12, targetLabel: '12회 × 3' },
      { name: '카프 레이즈', bodyPart: '하체', equipment: '머신', totalSets: 4, exerciseSec: 30, restSec: 45, targetReps: 15, targetLabel: '15회 × 4' },
    ],
  },
];

export function getProgram(id: string): WorkoutProgram | undefined {
  return PROGRAMS.find((p) => p.id === id);
}
