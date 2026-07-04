import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

export interface Location {
  id: string;
  tripId: string;
  name: string;
  latitude: number;
  longitude: number;
  visitDate: string;
  rating?: number;
  note?: string;
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
  async (_, { rejectWithValue }) => {
    try {
      const locationsCol = collection(db, 'locations');
      const snapshot = await getDocs(locationsCol);
      const locationsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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
