import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  BottomTabScreenProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DialogHost from './src/components/DialogHost';
import { Loading } from './src/components/ui';
import { RootStackParamList, TabParamList } from './src/navigation';
import BodyScreen from './src/screens/BodyScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import FiveByFiveScreen from './src/screens/FiveByFiveScreen';
import FiveByFiveSetupScreen from './src/screens/FiveByFiveSetupScreen';
import FiveByFiveStatsScreen from './src/screens/FiveByFiveStatsScreen';
import PlanEditScreen from './src/screens/PlanEditScreen';
import ExercisePickerScreen from './src/screens/ExercisePickerScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProgramDetailScreen from './src/screens/ProgramDetailScreen';
import ProgramsScreen from './src/screens/ProgramsScreen';
import RoutineEditScreen from './src/screens/RoutineEditScreen';
import RoutinesScreen from './src/screens/RoutinesScreen';
import SessionDetailScreen from './src/screens/SessionDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StatsScreen from './src/screens/StatsScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import { AppProvider, useApp } from './src/store/AppContext';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
    notification: colors.primary,
  },
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICON: Record<keyof TabParamList, [IoniconName, IoniconName]> = {
  Home: ['home', 'home-outline'],
  Routines: ['barbell', 'barbell-outline'],
  Calendar: ['calendar', 'calendar-outline'],
  Stats: ['stats-chart', 'stats-chart-outline'],
  Settings: ['settings', 'settings-outline'],
};

const TAB_LABEL: Record<keyof TabParamList, string> = {
  Home: '홈',
  Routines: '루틴',
  Calendar: '달력',
  Stats: '통계',
  Settings: '설정',
};

function TabIcon({ name, focused }: { name: keyof TabParamList; focused: boolean }) {
  const [active, inactive] = TAB_ICON[name];
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons
        name={focused ? active : inactive}
        size={23}
        color={focused ? colors.primary : colors.faint}
      />
    </View>
  );
}

function Tabs(_props: NativeStackScreenProps<RootStackParamList, 'Tabs'>) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElev,
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabel: TAB_LABEL[route.name],
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen as React.ComponentType}
        options={{ title: '홈' }}
      />
      <Tab.Screen
        name="Routines"
        component={RoutinesScreen as React.ComponentType}
        options={{ title: '내 루틴' }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen as React.ComponentType}
        options={{ title: '운동 달력' }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen as React.ComponentType}
        options={{ title: '통계' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen as React.ComponentType}
        options={{ title: '설정' }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { loading } = useApp();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Loading />
      </View>
    );
  }
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { color: colors.text, fontWeight: '800', fontSize: 17 },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen
          name="Tabs"
          component={Tabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RoutineEdit"
          component={RoutineEditScreen}
          options={{ title: '루틴 편집', presentation: 'modal' }}
        />
        <Stack.Screen
          name="ExercisePicker"
          component={ExercisePickerScreen}
          options={{ title: '운동 추가', presentation: 'modal' }}
        />
        <Stack.Screen
          name="Workout"
          component={WorkoutScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="SessionDetail"
          component={SessionDetailScreen}
          options={{ title: '운동 기록' }}
        />
        <Stack.Screen
          name="Programs"
          component={ProgramsScreen}
          options={{ title: '운동 프로그램' }}
        />
        <Stack.Screen
          name="ProgramDetail"
          component={ProgramDetailScreen}
          options={{ title: '프로그램' }}
        />
        <Stack.Screen
          name="Body"
          component={BodyScreen}
          options={{ title: '인바디 기록' }}
        />
        <Stack.Screen
          name="FiveByFive"
          component={FiveByFiveScreen}
          options={{ title: '5×5 프로그램' }}
        />
        <Stack.Screen
          name="FiveByFiveSetup"
          component={FiveByFiveSetupScreen}
          options={{ title: '5×5 설정' }}
        />
        <Stack.Screen
          name="FiveByFiveStats"
          component={FiveByFiveStatsScreen}
          options={{ title: '5×5 통계' }}
        />
        <Stack.Screen
          name="PlanEdit"
          component={PlanEditScreen}
          options={{ title: '운동 계획 짜기', presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Root />
        <DialogHost />
      </AppProvider>
    </SafeAreaProvider>
  );
}

// 타입 헬퍼 재노출 (스크린에서 import용)
export type { BottomTabScreenProps };
