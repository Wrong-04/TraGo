import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { Home, Map as MapIcon, Image as ImageIcon, User, Sparkles } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';
import { translations } from '../constants/translations';
import { Platform } from 'react-native';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import TripsScreen from '../screens/Trips/TripsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import MapScreen from '../screens/Maps/MapScreen';
import GalleryScreen from '../screens/Gallery/GalleryScreen';

import { BlurView } from 'expo-blur';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const theme = useTheme();
  const settings = useSelector((state: RootState) => state.settings);
  const texts = translations[settings.language].tabs;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5', // Indigo-600
        tabBarInactiveTintColor: '#94A3B8', // Slate-400
        tabBarShowLabel: true,
        tabBarBackground: () => (
          <BlurView tint="light" intensity={80} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: -4,
          marginBottom: Platform.OS === 'ios' ? 0 : 8,
        },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: 'transparent',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{
          tabBarLabel: texts.home,
          tabBarIcon: ({ color, size, focused }) => <Home color={color} size={focused ? 26 : 24} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tab.Screen 
        name="TripsTab" 
        component={TripsScreen} 
        options={{
          tabBarLabel: texts.trips,
          tabBarIcon: ({ color, size, focused }) => <Sparkles color={color} size={focused ? 26 : 24} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tab.Screen 
        name="MapTab" 
        component={MapScreen} 
        options={{
          tabBarLabel: texts.map,
          tabBarIcon: ({ color, size, focused }) => <MapIcon color={color} size={focused ? 26 : 24} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tab.Screen 
        name="GalleryTab" 
        component={GalleryScreen} 
        options={{
          tabBarLabel: texts.gallery,
          tabBarIcon: ({ color, size, focused }) => <ImageIcon color={color} size={focused ? 26 : 24} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: texts.profile,
          tabBarIcon: ({ color, size, focused }) => <User color={color} size={focused ? 26 : 24} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
    </Tab.Navigator>
  );
}
