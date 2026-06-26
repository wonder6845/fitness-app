import { NavigatorScreenParams } from '@react-navigation/native';
import { RoutineExercise } from './types';

export type TabParamList = {
  Home: undefined;
  Routines: undefined;
  Calendar: undefined;
  Stats: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  RoutineEdit: { routineId?: string } | undefined;
  ExercisePicker: undefined;
  Workout: {
    routineId?: string;
    resume?: boolean;
    // 인라인 루틴(저장 안 된 임시 운동) — 5×5 등 프로그램용
    exercises?: RoutineExercise[];
    title?: string;
    programId?: string;
    programRoutine?: '5x5-A' | '5x5-B';
  };
  SessionDetail: { sessionId: string };
  Programs: undefined;
  ProgramDetail: { programId: string };
  Body: undefined;
  FiveByFive: undefined;
  FiveByFiveSetup: { edit?: boolean } | undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
