import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LanguageCode = 'vi' | 'en';
export type DistanceUnit = 'Kilomet' | 'Miles';

export interface SettingsState {
  darkMode: boolean;
  language: LanguageCode;
  notificationsEnabled: boolean;
  backupEnabled: boolean;
  distanceUnit: DistanceUnit;
}

const initialState: SettingsState = {
  darkMode: false,
  language: 'vi',
  notificationsEnabled: true,
  backupEnabled: false,
  distanceUnit: 'Kilomet',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setDarkMode(state, action: PayloadAction<boolean>) {
      state.darkMode = action.payload;
    },
    setLanguage(state, action: PayloadAction<LanguageCode>) {
      state.language = action.payload;
    },
    setNotificationsEnabled(state, action: PayloadAction<boolean>) {
      state.notificationsEnabled = action.payload;
    },
    setBackupEnabled(state, action: PayloadAction<boolean>) {
      state.backupEnabled = action.payload;
    },
    setDistanceUnit(state, action: PayloadAction<DistanceUnit>) {
      state.distanceUnit = action.payload;
    },
  },
});

export const {
  setDarkMode,
  setLanguage,
  setNotificationsEnabled,
  setBackupEnabled,
  setDistanceUnit,
} = settingsSlice.actions;

export default settingsSlice.reducer;
