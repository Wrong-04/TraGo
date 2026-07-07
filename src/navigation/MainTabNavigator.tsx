import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { Home, Map as MapIcon, Image as ImageIcon, User, Sparkles } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../features/store';
import { translations } from '../constants/translations';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import TripsScreen from '../screens/Trips/TripsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import MapScreen from '../screens/Maps/MapScreen';
import GalleryScreen from '../screens/Gallery/GalleryScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const theme = useTheme();
  const settings = useSelector((state: RootState) => state.settings);
  const texts = translations[settings.language].tabs;

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
          tabBarLabel: texts.home,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="TripsTab" 
        component={TripsScreen} 
        options={{
          tabBarLabel: texts.trips,
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="MapTab" 
        component={MapScreen} 
        options={{
          tabBarLabel: texts.map,
          tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="GalleryTab" 
        component={GalleryScreen} 
        options={{
          tabBarLabel: texts.gallery,
          tabBarIcon: ({ color, size }) => <ImageIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: texts.profile,
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
