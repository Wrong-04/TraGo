import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../config/supabase';

export interface TripActivity {
  time: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  estimatedCost?: number;
}

export interface TripDay {
  day: number;
  theme?: string;
  activities: TripActivity[];
}

export interface Trip {
  id: string;
  title: string;
  description?: string;
  country?: string;
  city?: string;
  startDate: string;
  endDate: string;
  budget?: number;
  totalDistance?: number;
  totalLocations?: number;
  totalCost?: number;
  status?: string;
  coverImage?: string;
  tags?: string[];
  latitude?: number;
  longitude?: number;
  address?: string;
  itinerary?: TripDay[];
  createdAt: string;
}

interface TripsState {
  items: Trip[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TripsState = {
  items: [],
  isLoading: false,
  error: null,
};

// Async thunk để lấy dữ liệu từ Supabase
export const fetchTrips = createAsyncThunk('trips/fetchTrips', async (userId: string | undefined, { rejectWithValue }) => {
  try {
    let query = supabase.from('trips').select('*, trip_locations(id, distance_from_previous)').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw error;

    const trips: Trip[] = data.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      country: item.country,
      city: item.city,
      startDate: item.start_date,
      endDate: item.end_date,
      budget: item.budget,
      totalDistance: (item.trip_locations ? item.trip_locations.reduce((sum: number, loc: any) => sum + (loc.distance_from_previous || 0), 0) : 0) || item.total_distance || 0,
      totalLocations: item.trip_locations ? item.trip_locations.length : 0,
      totalCost: item.total_cost,
      status: item.status,
      coverImage: item.cover_image,
      tags: item.tags || [],
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address,
      createdAt: item.created_at,
    }));
    return trips;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

export const deleteTrip = createAsyncThunk('trips/deleteTrip', async (tripId: string, { rejectWithValue }) => {
  try {
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) throw error;
    return tripId;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

const tripsSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrips.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTrips.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchTrips.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteTrip.fulfilled, (state, action) => {
        state.items = state.items.filter(trip => trip.id !== action.payload);
      });
  },
});

export default tripsSlice.reducer;
