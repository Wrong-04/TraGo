import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Màu chủ đạo Blue: #2563EB
const primaryColor = '#2563EB';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: primaryColor,
    primaryContainer: '#DDE7FF',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#001A42',
    secondary: '#4F5E7B',
    secondaryContainer: '#D3E3FF',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    error: '#EF4444',
  },
  roundness: 16, // Bo góc 16px như thiết kế
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#A6C8FF',
    primaryContainer: primaryColor,
    onPrimary: '#002E6A',
    onPrimaryContainer: '#FFFFFF',
    secondary: '#B8C7E6',
    secondaryContainer: '#374662',
    background: '#0F172A',
    surface: '#1E293B',
    error: '#F87171',
  },
  roundness: 16,
};
