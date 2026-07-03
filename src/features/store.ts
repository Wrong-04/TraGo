import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import tripsReducer from './trips/tripsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Bỏ qua check cho các object firebase nếu cần
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
