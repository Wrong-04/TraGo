import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../config/supabase';

export interface TripLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  visit_date?: string;
  image?: string;
  rating?: number;
  review?: string;
  order_index?: number;
  distance_from_previous?: number;
  travel_time_minutes?: number;
}

interface TripDetailState {
  locations: TripLocation[];
  gallery: any[];
  journals: any[];
  expenses: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TripDetailState = {
  locations: [],
  gallery: [],
  journals: [],
  expenses: [],
  isLoading: false,
  error: null,
};

// Async thunk để kéo toàn bộ dữ liệu liên quan đến 1 Trip
export const fetchTripDetailData = createAsyncThunk(
  'tripDetail/fetchData',
  async (tripId: string, { rejectWithValue }) => {
    try {
      // Chạy 4 queries song song để tối ưu tốc độ
      const [locationsRes, galleryRes, journalsRes, expensesRes] = await Promise.all([
        supabase.from('trip_locations').select('*').eq('trip_id', tripId).order('order_index', { ascending: true }),
        supabase.from('gallery').select('*').eq('trip_id', tripId),
        supabase.from('journals').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
        supabase.from('trip_expenses').select('*').eq('trip_id', tripId)
      ]);

      if (locationsRes.error) throw locationsRes.error;
      if (galleryRes.error) throw galleryRes.error;
      if (journalsRes.error) throw journalsRes.error;
      if (expensesRes.error) throw expensesRes.error;

      return {
        locations: locationsRes.data as TripLocation[],
        gallery: galleryRes.data,
        journals: journalsRes.data,
        expenses: expensesRes.data
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const tripDetailSlice = createSlice({
  name: 'tripDetail',
  initialState,
  reducers: {
    clearTripDetail: (state) => {
      state.locations = [];
      state.gallery = [];
      state.journals = [];
      state.expenses = [];
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTripDetailData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTripDetailData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.locations = action.payload.locations;
        state.gallery = action.payload.gallery;
        state.journals = action.payload.journals;
        state.expenses = action.payload.expenses;
      })
      .addCase(fetchTripDetailData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTripDetail } = tripDetailSlice.actions;
export default tripDetailSlice.reducer;
