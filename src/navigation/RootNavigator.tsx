import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';

import LoginScreen from '../screens/Auth/LoginScreen';
import SplashScreen from '../screens/Splash/SplashScreen';
import MainTabNavigator from './MainTabNavigator';

import AddTripScreen from '../screens/Trips/AddTripScreen';
import TripDetailScreen from '../screens/Trips/TripDetailScreen';
// import AIPlannerScreen from '../screens/Trips/AIPlannerScreen'; // Tạm thời để sau

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return <SplashScreen />;
  }

  return user ? (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainTabs" component={MainTabNavigator} />
      <MainStack.Screen name="AddTrip" component={AddTripScreen} />
      <MainStack.Screen name="TripDetail" component={TripDetailScreen} />
    </MainStack.Navigator>
  ) : (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}
