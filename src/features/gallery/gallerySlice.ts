import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../config/supabase';

export interface GalleryImage {
  id: string;
  tripId: string;
  title: string;
  image: string;
  createdAt?: string;
}

interface GalleryState {
  images: GalleryImage[];
  isLoading: boolean;
  error: string | null;
}

const initialState: GalleryState = {
  images: [],
  isLoading: false,
  error: null,
};

export const fetchGallery = createAsyncThunk(
  'gallery/fetchGallery',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      const imagesList = data.map(doc => ({
        id: doc.id,
        tripId: doc.trip_id || '',
        title: 'Kỷ niệm', 
        image: doc.url,
        createdAt: doc.created_at,
      })) as GalleryImage[];
      return imagesList;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const gallerySlice = createSlice({
  name: 'gallery',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGallery.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGallery.fulfilled, (state, action) => {
        state.isLoading = false;
        state.images = action.payload;
      })
      .addCase(fetchGallery.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default gallerySlice.reducer;
