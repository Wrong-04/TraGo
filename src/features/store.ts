import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './auth/authSlice';
import tripsReducer from './trips/tripsSlice';
import tripDetailReducer from './trips/tripDetailSlice';
import mapReducer from './map/mapSlice';
import galleryReducer from './gallery/gallerySlice';
import settingsReducer from './settings/settingsSlice';
import { combineReducers } from 'redux';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['settings', 'auth'], // Only persist settings and auth state
};

const rootReducer = combineReducers({
  auth: authReducer,
  trips: tripsReducer,
  tripDetail: tripDetailReducer,
  map: mapReducer,
  gallery: galleryReducer,
  settings: settingsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
