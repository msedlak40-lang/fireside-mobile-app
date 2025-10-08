import React, { useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabaseClient';
import Auth from '../screens/Auth';
import Home from '../screens/Home';

type RootStackParamList = { Auth: undefined; Home: undefined };
const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: [ExpoLinking.createURL('/'), 'fireside://', 'exp+fireside://'],
  config: { screens: { Auth: 'auth', Home: 'home' } },
};

export default function AppNavigator() {
  const [initialUrlChecked, setInitialUrlChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        await supabase.auth.exchangeCodeForSession(url);
      } catch { /* ignore; Auth will show if not authed */ }
    };

    (async () => {
      const url = await ExpoLinking.getInitialURL();
      await handleUrl(url);
      const { data } = await supabase.auth.getSession();
      setIsAuthed(!!data.session);
      setInitialUrlChecked(true);
    })();

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  const theme = useMemo(() => ({ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#fff' } }), []);

  if (!initialUrlChecked) return null;

  return (
    <NavigationContainer linking={linking} theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthed ? <Stack.Screen name="Home" component={Home} /> : <Stack.Screen name="Auth" component={Auth} />}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
