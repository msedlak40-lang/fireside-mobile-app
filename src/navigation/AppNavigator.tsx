// src/navigation/AppNavigator.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ExpoLinking from 'expo-linking';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';

// Screens
import Auth from '../screens/Auth';
import BibleHomeScreen from '../components/BibleHomeScreen';
import ChapterScreen from '../components/ChapterScreen';
import VerseScreen from '../components/VerseScreen';
import ReadingPlanDayScreen from '../screens/ReadingPlanDayScreen';

// Devotions
import DevotionsHomeTabs from '../components/Devotions/DevotionsHomeTabs';
import ThemeListScreen from '../components/Devotions/ThemeListScreen';
import DevotionDetailScreen from '../components/Devotions/DevotionDetailScreen';

// Characters
import CharactersHomeScreen from '../components/Characters/CharactersHomeScreen';
import CharacterDetailScreen from '../components/Characters/CharacterDetailScreen';
import CharacterLessonScreen from '../components/Characters/CharacterLessonScreen';

// Reading Plans
import ReadingPlansHomeScreen from '../components/ReadingPlans/ReadingPlansHomeScreen';
import ReadingPlanDetailScreen from '../components/ReadingPlans/ReadingPlanDetailScreen';

// Progress = Home
import ProgressDashboardScreen from '../components/Progress/ProgressDashboardScreen';

// Prayer / Chair Time
import PrayerHomeScreen from '../screens/Prayer/PrayerHomeScreen';
import PrayerSessionScreen from '../screens/Prayer/PrayerSessionScreen';
import PrayerHistoryScreen from '../screens/Prayer/PrayerHistoryScreen';

// Notes & Highlights summary (new screen)
import NotesHighlightsSummary from '../screens/NotesHighlightsSummary';

// Search
import BibleSearchScreen from '../screens/BibleSearchScreen';

// Armor of God
import ArmorUpHome from '../screens/ArmorUpHome';
import BattleIdentification from '../screens/BattleIdentification';
import BattleVerse from '../screens/BattleVerse';
import DailyReflection from '../screens/DailyReflection';
import VictoryReflection from '../screens/VictoryReflection';
import DailyArmorChallenge from '../screens/DailyArmorChallenge';

// ---- Stacks ----
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bible Tab
const BibleStack = createNativeStackNavigator();
function BibleStackNavigator() {
  return (
    <BibleStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background.secondary,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <BibleStack.Screen
        name="BibleHome"
        component={BibleHomeScreen}
        options={{ headerTitle: 'Bible' }}
      />
      <BibleStack.Screen
        name="Chapter"
        component={ChapterScreen}
        options={{ headerTitle: 'Chapter' }}
      />
      <BibleStack.Screen
        name="Verse"
        component={VerseScreen}
        options={{ headerTitle: 'Verse' }}
      />
    </BibleStack.Navigator>
  );
}

// Devotions Tab
const DevotionsStack = createNativeStackNavigator();
function DevotionsStackNavigator() {
  return (
    <DevotionsStack.Navigator>
      <DevotionsStack.Screen
        name="DevotionsHome"
        component={DevotionsHomeTabs}
        options={{ headerTitle: 'Devotions' }}
      />
      <DevotionsStack.Screen
        name="ThemeList"
        component={ThemeListScreen}
        options={({ route }: any) => ({ headerTitle: route.params.category })}
      />
      <DevotionsStack.Screen
        name="DevotionDetail"
        component={DevotionDetailScreen}
        options={{ headerTitle: 'Devotion' }}
      />
    </DevotionsStack.Navigator>
  );
}

// Characters Tab
const CharactersStack = createNativeStackNavigator();
function CharactersStackNavigator() {
  return (
    <CharactersStack.Navigator>
      <CharactersStack.Screen
        name="CharactersHome"
        component={CharactersHomeScreen}
        options={{ headerTitle: 'Bible Characters' }}
      />
      <CharactersStack.Screen
        name="CharacterDetail"
        component={CharacterDetailScreen}
        options={{ headerTitle: 'Character' }}
      />
      <CharactersStack.Screen
        name="CharacterLesson"
        component={CharacterLessonScreen}
        options={{ headerTitle: 'Lesson' }}
      />
    </CharactersStack.Navigator>
  );
}

// Reading Plans Tab
const ReadingPlansStack = createNativeStackNavigator();
function ReadingPlansStackNavigator() {
  return (
    <ReadingPlansStack.Navigator>
      <ReadingPlansStack.Screen
        name="ReadingPlansHome"
        component={ReadingPlansHomeScreen}
        options={{ headerTitle: 'Reading Plans' }}
      />
      <ReadingPlansStack.Screen
        name="ReadingPlanDetail"
        component={ReadingPlanDetailScreen}
        options={{ headerTitle: 'Plan Details' }}
      />
      {/* NEW: opens when a day is tapped */}
      <ReadingPlansStack.Screen
        name="ReadingPlanDay"
        component={ReadingPlanDayScreen}
        options={{ headerTitle: 'Plan Day' }}
      />
    </ReadingPlansStack.Navigator>
  );
}


// Progress/Home Tab (now includes Notes & Highlights + DevotionDetail for direct nav from Home)
const ProgressStack = createNativeStackNavigator();
function ProgressStackNavigator() {
  return (
    <ProgressStack.Navigator>
      <ProgressStack.Screen
        name="ProgressDashboard"
        component={ProgressDashboardScreen}
        options={{ headerTitle: 'Home' }}
      />
      <ProgressStack.Screen
        name="NotesHighlightsSummary"
        component={NotesHighlightsSummary}
        options={{ headerTitle: 'Notes & Highlights' }}
      />
      {/* Add DevotionDetail here too, so Home can open it directly */}
      <ProgressStack.Screen
        name="DevotionDetail"
        component={DevotionDetailScreen}
        options={{ headerTitle: 'Devotion' }}
      />
      {/* Armor of God screens */}
      <ProgressStack.Screen
        name="ArmorUpHome"
        component={ArmorUpHome}
        options={{ headerTitle: 'Armor of God' }}
      />
      <ProgressStack.Screen
        name="BattleIdentification"
        component={BattleIdentification}
        options={{ headerTitle: 'Identify Battle' }}
      />
      <ProgressStack.Screen
        name="BattleVerse"
        component={BattleVerse}
        options={{ headerTitle: 'Battle Verse' }}
      />
      <ProgressStack.Screen
        name="DailyReflection"
        component={DailyReflection}
        options={{ headerTitle: 'Daily Reflection' }}
      />
      <ProgressStack.Screen
        name="DailyArmorChallenge"
        component={DailyArmorChallenge}
        options={{ headerTitle: 'Today\'s Armor Challenge' }}
      />
      <ProgressStack.Screen
        name="VictoryReflection"
        component={VictoryReflection}
        options={{ headerTitle: 'Victory Reflection' }}
      />
    </ProgressStack.Navigator>
  );
}

// Prayer Tab
const PrayerStack = createNativeStackNavigator();
function PrayerStackNavigator() {
  return (
    <PrayerStack.Navigator>
      <PrayerStack.Screen
        name="PrayerHome"
        component={PrayerHomeScreen}
        options={{ headerTitle: 'Prayer' }}
      />
      <PrayerStack.Screen
        name="PrayerSession"
        component={PrayerSessionScreen}
        options={{ headerTitle: 'Prayer Session', headerShown: false }}
      />
      <PrayerStack.Screen
        name="PrayerHistory"
        component={PrayerHistoryScreen}
        options={{ headerTitle: 'Prayer History' }}
      />
    </PrayerStack.Navigator>
  );
}

// Search Tab
const SearchStack = createNativeStackNavigator();
function SearchStackNavigator() {
  return (
    <SearchStack.Navigator>
      <SearchStack.Screen
        name="BibleSearch"
        component={BibleSearchScreen}
        options={{ headerTitle: 'Search' }}
      />
    </SearchStack.Navigator>
  );
}

// ---- Bottom Tabs ----
function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 6);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.tabBar.background,
          borderTopColor: colors.border.default,
          borderTopWidth: 1,
          height: 56 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6
        },
        tabBarActiveTintColor: colors.tabBar.active,
        tabBarInactiveTintColor: colors.tabBar.inactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 0
        },
        tabBarIconStyle: { marginTop: 2 }
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={ProgressStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>
        }}
      />
      <Tab.Screen
        name="BibleTab"
        component={BibleStackNavigator}
        options={{
          title: 'Bible',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📖</Text>
        }}
      />
      <Tab.Screen
        name="CharactersTab"
        component={CharactersStackNavigator}
        options={{
          title: 'People',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>
        }}
      />
      <Tab.Screen
        name="PlansTab"
        component={ReadingPlansStackNavigator}
        options={{
          title: 'Plans',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📅</Text>
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStackNavigator}
        options={{
          title: 'Search',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🔍</Text>
        }}
      />
      <Tab.Screen
        name="PrayerTab"
        component={PrayerStackNavigator}
        options={{
          title: 'Prayer',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🙏</Text>
        }}
      />
    </Tab.Navigator>
  );
}

// ---- Linking ----
const linking = {
  prefixes: [ExpoLinking.createURL('/'), 'fireside://'],
  config: {
    screens: {
      Auth: 'auth',
      MainTabs: {
        screens: {
          HomeTab: {
            screens: {
              ProgressDashboard: 'home',
              NotesHighlightsSummary: 'home/notes',
              DevotionDetail: 'home/devotion/:id'
            }
          },
          BibleTab: {
            screens: {
              BibleHome: 'bible',
              Chapter: 'bible/:bookId/:chapter',
              Verse: 'bible/:bookId/:chapter/:verse'
            }
          },
          DevotionsTab: {
            screens: {
              DevotionsHome: 'devotions',
              ThemeList: 'devotions/theme/:category',
              DevotionDetail: 'devotions/:id'
            }
          },
          CharactersTab: {
            screens: {
              CharactersHome: 'characters',
              CharacterDetail: 'characters/:id',
              CharacterLesson: 'characters/lesson/:id'
            }
          },
          PlansTab: {
            screens: {
              ReadingPlansHome: 'plans',
              ReadingPlanDetail: 'plans/:planId'
            }
          },
          SearchTab: {
            screens: {
              BibleSearch: 'search'
            }
          },
          PrayerTab: {
            screens: {
              PrayerHome: 'prayer',
              PrayerSession: 'prayer/session',
              PrayerHistory: 'prayer/history'
            }
          }
        }
      }
    }
  }
};

// ---- Auth helpers removed (no longer using magic links) ----

// ---- Root Navigator ----
export default function AppNavigator() {
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  // Keep screen awake while app is open
  useEffect(() => {
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Check if there's an existing Supabase session
        const { data } = await supabase.auth.getSession();
        const hasSession = !!data.session;

        if (hasSession) {
          // Session exists - allow access
          // Note: Biometric unlock will be implemented for app resume from background
          console.log('[AppNavigator] Session exists, allowing access');
          setIsAuthed(true);
        } else {
          // No session - show login screen
          console.log('[AppNavigator] No session, showing login screen');
          setIsAuthed(false);
        }
      } catch (err) {
        console.warn('[Auth] Session check failed', err);
        setIsAuthed(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const theme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: colors.background.primary,
        card: colors.background.secondary,
        text: colors.text.primary,
        border: colors.border.default,
        primary: colors.accent.primary,
      }
    }),
    []
  );

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator color={colors.accent.primary} />
        <Text style={{ marginTop: 8, color: colors.text.secondary }}>Loading…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking} theme={theme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthed ? (
          <RootStack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={Auth} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
