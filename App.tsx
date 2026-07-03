import React, { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';

import { store } from './src/features/store';
import { auth } from './src/config/firebase';
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }));
      } else {
        dispatch(setUser(null));
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return <RootNavigator />;
}
