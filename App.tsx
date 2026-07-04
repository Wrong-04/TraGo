import React, { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Firebase auth removed

import { store } from './src/features/store';
import { supabase } from './src/config/supabase';
import { setUser, setLoading } from './src/features/auth/authSlice';
import { lightTheme } from './src/constants/theme';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={lightTheme}>
        <SafeAreaProvider>
          <NavigationContainer>
            <AppContent />
            <StatusBar style="auto" />
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </ReduxProvider>
  );
}

// Tách riêng AppContent để có thể truy cập Redux hooks
function AppContent() {
  const dispatch = store.dispatch;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch(setUser({
          uid: session.user.id,
          email: session.user.email || null,
          displayName: session.user.user_metadata?.display_name || null,
          photoURL: session.user.user_metadata?.photo_url || null,
        }));
      } else {
        dispatch(setUser(null));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        dispatch(setUser({
          uid: session.user.id,
          email: session.user.email || null,
          displayName: session.user.user_metadata?.display_name || null,
          photoURL: session.user.user_metadata?.photo_url || null,
        }));
      } else {
        dispatch(setUser(null));
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <RootNavigator />;
}
