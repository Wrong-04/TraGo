import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { Home, Map as MapIcon, Image as ImageIcon, User, Sparkles } from 'lucide-react-native';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import TripsScreen from '../screens/Trips/TripsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import MapScreen from '../screens/Maps/MapScreen';
import GalleryScreen from '../screens/Gallery/GalleryScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="TripsTab" 
        component={TripsScreen} 
        options={{
          tabBarLabel: 'Chuyến đi',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="MapTab" 
        component={MapScreen} 
        options={{
          tabBarLabel: 'Bản đồ',
          tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="GalleryTab" 
        component={GalleryScreen} 
        options={{
          tabBarLabel: 'Thư viện',
          tabBarIcon: ({ color, size }) => <ImageIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Cá nhân',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
