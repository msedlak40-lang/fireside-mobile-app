// src/navigation/AppNavigator.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, Platform, TouchableOpacity } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ExpoLinking from 'expo-linking';
import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { getUserFires, getUnreadShareCount } from '../services/fire';

// Screens
import Auth from '../screens/Auth';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import BibleScreen from '../components/BibleScreen';
import ChapterScreen from '../components/ChapterScreen';
import VerseScreen from '../components/VerseScreen';
import ReadingPlanDayScreen from '../screens/ReadingPlanDayScreen';

// Devotions
import DevotionsHomeTabs from '../components/Devotions/DevotionsHomeTabs';
import ThemeListScreen from '../components/Devotions/ThemeListScreen';
import DevotionDetailScreen from '../components/Devotions/DevotionDetailScreen';
import DevotionArchiveScreen from '../screens/DevotionArchiveScreen';

// Characters
import CharactersHomeScreen from '../components/Characters/CharactersHomeScreen';
import CharacterDetailScreen from '../components/Characters/CharacterDetailScreen';
import CharacterLessonScreen from '../components/Characters/CharacterLessonScreen';

// Reading Plans
import ReadingPlansHomeScreen from '../components/ReadingPlans/ReadingPlansHomeScreen';
import ReadingPlanDetailScreen from '../components/ReadingPlans/ReadingPlanDetailScreen';

// Progress = Home
import ProgressDashboardScreen from '../components/Progress/ProgressDashboardScreen';

// TODO: Re-enable when Prayer feature is ready
// import JournalHomeScreen from '../components/Journal/JournalHomeScreen';
// import JournalCreateScreen from '../components/Journal/JournalCreateScreen';
// import JournalDetailScreen from '../components/Journal/JournalDetailScreen';

// Prayer (Coming Soon placeholder) — disabled for App Store submission
// import PrayerComingSoonScreen from '../screens/PrayerComingSoonScreen';

// Notes & Highlights summary
import NotesHighlightsSummary from '../screens/NotesHighlightsSummary';

// Search (now inside Bible stack)
import BibleSearchScreen from '../screens/BibleSearchScreen';

// Settings
import SettingsScreen from '../screens/SettingsScreen';

// VOTD Archive
import VOTDArchiveScreen from '../screens/VOTDArchiveScreen';

// Arsenal
import ArsenalScreen from '../screens/ArsenalScreen';

// Fire
import FireScreen from '../screens/FireScreen';
import FireDetailsScreen from '../screens/FireDetailsScreen';

// Study
import StudyHomeScreen from '../screens/StudyHomeScreen';

// Journeys
import JourneyCatalogScreen from '../screens/JourneyCatalogScreen';
import JourneyDetailScreen from '../screens/JourneyDetailScreen';
import JourneyExperienceScreen from '../screens/JourneyExperienceScreen';
import JourneyLocationScreen from '../screens/JourneyLocationScreen';

// Deep Study (Strong's word study — the verse "Deeper" surface)
import DeepStudyScreen from '../screens/DeepStudyScreen';

// ---- Stacks ----
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bible Tab (now includes Search)
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
        component={BibleScreen}
        options={({ navigation }: any) => ({
          headerTitle: 'Bible',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('BibleSearch')}
              style={{ marginRight: 8 }}
            >
              <Text style={{ fontSize: 24 }}>🔍</Text>
            </TouchableOpacity>
          ),
        })}
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
      <BibleStack.Screen
        name="BibleSearch"
        component={BibleSearchScreen}
        options={{ headerTitle: 'Search' }}
      />
      <BibleStack.Screen
        name="DeepStudy"
        component={DeepStudyScreen}
        options={{ headerTitle: 'Deep Study' }}
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
      <DevotionsStack.Screen
        name="DevotionArchive"
        component={DevotionArchiveScreen}
        options={{ headerTitle: 'Past Devotions' }}
      />
    </DevotionsStack.Navigator>
  );
}

// Study Tab (combines Characters + Reading Plans)
const StudyStack = createNativeStackNavigator();
function StudyStackNavigator() {
  return (
    <StudyStack.Navigator>
      <StudyStack.Screen
        name="StudyHome"
        component={StudyHomeScreen}
        options={{ headerTitle: 'Study' }}
      />
      {/* Characters screens */}
      <StudyStack.Screen
        name="CharactersHome"
        component={CharactersHomeScreen}
        options={{ headerTitle: 'Biblical Characters' }}
      />
      <StudyStack.Screen
        name="CharacterDetail"
        component={CharacterDetailScreen}
        options={{ headerTitle: 'Character' }}
      />
      <StudyStack.Screen
        name="CharacterLesson"
        component={CharacterLessonScreen}
        options={{ headerTitle: 'Lesson' }}
      />
      {/* Reading Plans screens */}
      <StudyStack.Screen
        name="ReadingPlansHome"
        component={ReadingPlansHomeScreen}
        options={{ headerTitle: 'Reading Plans' }}
      />
      <StudyStack.Screen
        name="ReadingPlanDetail"
        component={ReadingPlanDetailScreen}
        options={{ headerTitle: 'Plan Details' }}
      />
      <StudyStack.Screen
        name="ReadingPlanDay"
        component={ReadingPlanDayScreen}
        options={{ headerTitle: 'Plan Day' }}
      />
      {/* Journey screens */}
      <StudyStack.Screen
        name="JourneyCatalog"
        component={JourneyCatalogScreen}
        options={{ headerTitle: 'Journeys' }}
      />
      <StudyStack.Screen
        name="JourneyDetail"
        component={JourneyDetailScreen}
        options={{ headerTitle: 'Journey' }}
      />
      <StudyStack.Screen
        name="JourneyExperience"
        component={JourneyExperienceScreen}
        options={{ headerShown: false }}
      />
      <StudyStack.Screen
        name="JourneyLocation"
        component={JourneyLocationScreen}
        options={{ headerTitle: 'Location' }}
      />
    </StudyStack.Navigator>
  );
}

// Progress/Home Tab (includes Notes & Highlights + DevotionDetail for direct nav from Home)
const ProgressStack = createNativeStackNavigator();
function ProgressStackNavigator() {
  return (
    <ProgressStack.Navigator>
      <ProgressStack.Screen
        name="ProgressDashboard"
        component={ProgressDashboardScreen}
        options={({ navigation }) => ({
          headerTitle: 'Home',
          headerRight: () => (
            <Text
              onPress={() => navigation.navigate('Settings')}
              style={{ fontSize: 22, paddingRight: 8 }}
            >
              ⚙️
            </Text>
          ),
        })}
      />
      <ProgressStack.Screen
        name="NotesHighlightsSummary"
        component={NotesHighlightsSummary}
        options={{ headerTitle: 'Notes & Highlights' }}
      />
      <ProgressStack.Screen
        name="DevotionDetail"
        component={DevotionDetailScreen}
        options={{ headerTitle: 'Devotion' }}
      />
      <ProgressStack.Screen
        name="DevotionArchive"
        component={DevotionArchiveScreen}
        options={{ headerTitle: 'Past Devotions' }}
      />
      <ProgressStack.Screen
        name="VOTDArchive"
        component={VOTDArchiveScreen}
        options={{ headerTitle: 'Verse of the Day Archive' }}
      />
      <ProgressStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerTitle: 'Settings' }}
      />
    </ProgressStack.Navigator>
  );
}

// Prayer Tab — disabled for App Store submission (re-enable when feature is ready)
// const PrayerStack = createNativeStackNavigator();
// function PrayerStackNavigator() {
//   return (
//     <PrayerStack.Navigator>
//       <PrayerStack.Screen
//         name="PrayerHome"
//         component={PrayerComingSoonScreen}
//         options={{ headerTitle: 'Prayer' }}
//       />
//     </PrayerStack.Navigator>
//   );
// }

// Arsenal Tab
const ArsenalStack = createNativeStackNavigator();
function ArsenalStackNavigator() {
  return (
    <ArsenalStack.Navigator>
      <ArsenalStack.Screen
        name="ArsenalHome"
        component={ArsenalScreen}
        options={{ headerTitle: 'Arsenal' }}
      />
    </ArsenalStack.Navigator>
  );
}

// Fire Tab
const FireStack = createNativeStackNavigator();
function FireStackNavigator() {
  return (
    <FireStack.Navigator>
      <FireStack.Screen
        name="FireHome"
        component={FireScreen}
        options={{ headerTitle: 'Fire' }}
      />
      <FireStack.Screen
        name="FireDetails"
        component={FireDetailsScreen}
        options={{ headerTitle: 'Fire' }}
      />
    </FireStack.Navigator>
  );
}

// ---- Bottom Tabs (5 tabs — Prayer disabled for App Store) ----
function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 6);
  const [fireUnreadCount, setFireUnreadCount] = useState(0);

  useEffect(() => {
    loadFireUnreadCount();
    const interval = setInterval(loadFireUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadFireUnreadCount() {
    try {
      const fires = await getUserFires();
      let total = 0;
      for (const fire of fires) {
        const count = await getUnreadShareCount(fire.id);
        total += count;
      }
      setFireUnreadCount(total);
    } catch (error) {
      // Silently fail - badge is non-critical
    }
  }

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
        name="ArsenalTab"
        component={ArsenalStackNavigator}
        options={{
          title: 'Arsenal',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗡️</Text>
        }}
      />
      <Tab.Screen
        name="StudyTab"
        component={StudyStackNavigator}
        options={{
          title: 'Study',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📚</Text>
        }}
      />
      <Tab.Screen
        name="FireTab"
        component={FireStackNavigator}
        options={{
          title: 'Fire',
          tabBarBadge: fireUnreadCount > 0 ? fireUnreadCount : undefined,
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🔥</Text>
        }}
      />
      {/* Prayer tab disabled for App Store submission
      <Tab.Screen
        name="PrayerTab"
        component={PrayerStackNavigator}
        options={{
          title: 'Prayer',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🙏</Text>
        }}
      />
      */}
    </Tab.Navigator>
  );
}

// ---- Linking ----
const linking = {
  prefixes: [ExpoLinking.createURL('/'), 'fireside://'],
  config: {
    screens: {
      Auth: 'auth',
      ResetPassword: 'auth/reset-password',
      MainTabs: {
        screens: {
          HomeTab: {
            screens: {
              ProgressDashboard: 'home',
              NotesHighlightsSummary: 'home/notes',
              DevotionDetail: 'home/devotion/:id',
              Settings: 'home/settings'
            }
          },
          BibleTab: {
            screens: {
              BibleHome: 'bible',
              Chapter: 'bible/:bookId/:chapter',
              Verse: 'bible/:bookId/:chapter/:verse',
              BibleSearch: 'search',
              DeepStudy: 'bible/deep-study'
            }
          },
          ArsenalTab: {
            screens: {
              ArsenalHome: 'arsenal'
            }
          },
          StudyTab: {
            screens: {
              StudyHome: 'study',
              CharactersHome: 'study/characters',
              CharacterDetail: 'study/characters/:id',
              CharacterLesson: 'study/characters/lesson/:id',
              ReadingPlansHome: 'study/plans',
              ReadingPlanDetail: 'study/plans/:planId',
              ReadingPlanDay: 'study/plans/:planId/day/:dayNumber',
              JourneyCatalog: 'study/journeys',
              JourneyDetail: 'study/journeys/:journeyId',
              JourneyExperience: 'study/journeys/:journeyId/experience',
              JourneyLocation: 'study/journeys/:journeyId/location/:locationIndex'
            }
          },
          FireTab: {
            screens: {
              FireHome: 'fire',
              FireDetails: 'fire/:fireId'
            }
          },
          // PrayerTab disabled for App Store submission
          // PrayerTab: {
          //   screens: {
          //     PrayerHome: 'prayer'
          //   }
          // }
        }
      }
    }
  }
};

// ---- Root Navigator ----
export default function AppNavigator() {
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const navigationRef = useNavigationContainerRef();

  // Keep screen awake while app is open
  useEffect(() => {
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthed(!!session);
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link — show the reset password screen
        setShowResetPassword(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Handle deep link recovery tokens from Supabase password reset emails
  useEffect(() => {
    const handleUrl = async (url: string) => {
      // Supabase recovery links contain hash fragments: #access_token=...&type=recovery
      const hashIdx = url.indexOf('#');
      if (hashIdx === -1) return;
      const hash = url.slice(hashIdx + 1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (type === 'recovery' && accessToken) {
        console.log('[AppNavigator] Password recovery deep link detected');
        try {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          // onAuthStateChange will fire PASSWORD_RECOVERY and set showResetPassword
        } catch (e) {
          console.warn('[AppNavigator] Failed to set recovery session:', e);
        }
      }
    };

    // Check if app was opened via a deep link
    ExpoLinking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Listen for deep links while app is open
    const sub = ExpoLinking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Check if there's an existing Supabase session
        const { data } = await supabase.auth.getSession();
        const hasSession = !!data.session;

        if (hasSession) {
          console.log('[AppNavigator] Session exists, allowing access');
          setIsAuthed(true);
        } else {
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
    <NavigationContainer ref={navigationRef} linking={linking} theme={theme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {showResetPassword ? (
          <RootStack.Screen
            name="ResetPassword"
            options={{ headerShown: true, title: 'Reset Password', headerStyle: { backgroundColor: colors.background.secondary }, headerTintColor: colors.text.primary }}
          >
            {() => <ResetPasswordScreen onComplete={() => setShowResetPassword(false)} />}
          </RootStack.Screen>
        ) : isAuthed ? (
          <RootStack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={Auth} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
