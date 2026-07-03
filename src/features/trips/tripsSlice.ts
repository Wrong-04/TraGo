import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

export interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  days: number;
  distance: number;
  imageUrl: string;
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

// Async thunk để lấy dữ liệu từ Firebase
export const fetchTrips = createAsyncThunk('trips/fetchTrips', async (_, { rejectWithValue }) => {
  try {
    const q = query(collection(db, 'trips'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const trips: Trip[] = [];
    querySnapshot.forEach((doc) => {
      trips.push({ id: doc.id, ...doc.data() } as Trip);
    });
    return trips;
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
      });
  },
});

export default tripsSlice.reducer;
