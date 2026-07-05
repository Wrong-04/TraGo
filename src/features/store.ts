import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import tripsReducer from './trips/tripsSlice';
import tripDetailReducer from './trips/tripDetailSlice';
import mapReducer from './map/mapSlice';
import galleryReducer from './gallery/gallerySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripsReducer,
    tripDetail: tripDetailReducer,
    map: mapReducer,
    gallery: galleryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
