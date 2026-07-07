import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';

import LoginScreen from '../screens/Auth/LoginScreen';
import SplashScreen from '../screens/Splash/SplashScreen';
import MainTabNavigator from './MainTabNavigator';

import AddTripScreen from '../screens/Trips/AddTripScreen';
import TripDetailScreen from '../screens/Trips/TripDetailScreen';
import AIPlannerScreen from '../screens/Trips/AIPlannerScreen';
import ProfileInfoScreen from '../screens/Profile/ProfileInfoScreen';
import NotificationsScreen from '../screens/Profile/NotificationsScreen';
import SettingsScreen from '../screens/Profile/SettingsScreen';
import PhotoDescriptionScreen from '../screens/Gallery/PhotoDescriptionScreen';

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
      <MainStack.Screen name="AIPlanner" component={AIPlannerScreen} />
      <MainStack.Screen name="TripDetail" component={TripDetailScreen} />
      <MainStack.Screen name="ProfileInfo" component={ProfileInfoScreen} />
      <MainStack.Screen name="Notifications" component={NotificationsScreen} />
      <MainStack.Screen name="PhotoDescription" component={PhotoDescriptionScreen} />
      <MainStack.Screen name="Settings" component={SettingsScreen} />
    </MainStack.Navigator>
  ) : (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}
