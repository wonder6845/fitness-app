import { NavigatorScreenParams } from '@react-navigation/native';

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
  Workout: { routineId?: string; resume?: boolean };
  SessionDetail: { sessionId: string };
  Programs: undefined;
  ProgramDetail: { programId: string };
  Body: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
