import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../config/supabase';

export interface TripActivity {
  time: string;
  description: string;
  location: string;
}

export interface TripDay {
  day: number;
  activities: TripActivity[];
}

export interface Trip {
  id: string;
  title: string;
  startDate: string;
  country?: string;
  city?: string;
  budget?: number;
  description?: string;
  status?: string;
  coverImage?: string;
  endDate: string;
  days?: number;
  distance?: number;
  imageUrl?: string;
  createdAt: string;
  itinerary?: TripDay[];
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
export const fetchTrips = createAsyncThunk('trips/fetchTrips', async (_, { rejectWithValue }) => {
  try {
    const { data, error } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    
    const trips: Trip[] = data.map(item => ({
      id: item.id,
      title: item.title,
      startDate: item.start_date,
      endDate: item.end_date,
      city: item.city,
      distance: item.distance,
      coverImage: item.cover_image,
      itinerary: item.itinerary,
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
