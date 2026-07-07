import React, { useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, AppDispatch, RootState } from './src/features/store';
import { supabase } from './src/config/supabase';
import { setUser } from './src/features/auth/authSlice';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/screens/Splash/SplashScreen';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { lightTheme, darkTheme } from './src/constants/theme';

function AppContent() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const darkMode = useSelector((state: RootState) => state.settings.darkMode);


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch(setUser({
          uid: session.user.id,
          email: session.user.email || null,
          displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.display_name || null,
          photoURL: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
        }));
      }
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        dispatch(setUser({
          uid: session.user.id,
          email: session.user.email || null,
          displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.display_name || null,
          photoURL: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
        }));
      } else {
        dispatch(setUser(null));
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  if (!splashFinished || !sessionChecked) {
    return <SplashScreen onFinish={() => setSplashFinished(true)} />;
  }

  return <RootNavigator />;
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContentWrapper />
    </Provider>
  );
}

function AppContentWrapper() {
  const darkMode = useSelector((state: RootState) => state.settings.darkMode);
  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppContent />
          <StatusBar style={darkMode ? 'light' : 'dark'} />
        </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
