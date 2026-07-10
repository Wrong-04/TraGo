import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../config/supabase';

export interface TripLocation {
  id: string;
  trip_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  visit_date: string;
  review?: string;
  rating?: number;
  distance_from_previous?: number;
  travel_time_minutes?: number;
  image?: string;
  status?: string;
  category?: string;
  is_favorite?: boolean;
  mood?: string;
  weather?: string;
  visit_time?: string;
  estimated_cost?: number;
  order_index?: number;
  created_at?: string;
}

interface MapState {
  locations: TripLocation[];
  isLoading: boolean;
  error: string | null;
}

const initialState: MapState = {
  locations: [],
  isLoading: false,
  error: null,
};

export const fetchLocations = createAsyncThunk(
  'map/fetchLocations',
  async (tripId: string | undefined, { rejectWithValue }) => {
    try {
      let query = supabase
        .from('trip_locations')
        .select('*')
        .order('visit_date', { ascending: true })
        .order('visit_time', { ascending: true })
        .order('created_at', { ascending: true });

      if (tripId) query = query.eq('trip_id', tripId);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as TripLocation[];
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.locations = action.payload;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default mapSlice.reducer;
