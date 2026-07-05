import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../config/supabase';

export interface Location {
  id: string;
  tripId: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  placeName?: string;
  visitDate: string;
  distanceFromPrevious?: number;
  travelTimeMinutes?: number;
  rating?: number;
  review?: string;
  orderIndex: number;
}

interface MapState {
  locations: Location[];
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
        .order('order_index', { ascending: true });

      if (tripId) query = query.eq('trip_id', tripId);

      const { data, error } = await query;
      if (error) throw error;

      const locationsList = data.map(doc => ({
        id: doc.id,
        tripId: doc.trip_id || '',
        name: doc.name || 'Địa điểm',
        latitude: doc.latitude || 0,
        longitude: doc.longitude || 0,
        address: doc.address,
        placeName: doc.place_name,
        visitDate: doc.visit_date || '',
        distanceFromPrevious: doc.distance_from_previous || 0,
        travelTimeMinutes: doc.travel_time_minutes || 0,
        rating: doc.rating,
        review: doc.review,
        orderIndex: doc.order_index || 0,
      })) as Location[];
      return locationsList;
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
