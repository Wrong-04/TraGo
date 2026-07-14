import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TripLocation {
  id: string;
  trip_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  visit_date: string;
  image?: string;
  rating?: number;
  review?: string;
  order_index?: number;
  distance_from_previous?: number;
  travel_time_minutes?: number;
  status?: string;
  category?: string;
  is_favorite?: boolean;
  mood?: string;
  weather?: string;
  visit_time?: string;
  estimated_cost?: number;
}

export interface GalleryItem {
  id: string;
  trip_id: string;
  location_id?: string;
  image_url?: string;
  url?: string;
  caption?: string;
  created_at: string;
}

export interface Journal {
  id: string;
  trip_id: string;
  title: string;
  content: string;
  mood?: string;
  date: string;
  created_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  name?: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
}

export interface AIPlan {
  id: string;
  trip_id: string;
  generated_content: string;
  created_at: string;
}

export interface TripStatistics {
  totalLocations: number;
  totalKm: number;
  totalPhotos: number;
  totalJournals: number;
  totalExpenses: number;
}

// ─── State ────────────────────────────────────────────────────────────────────
interface TripDetailState {
  locations: TripLocation[];
  gallery: GalleryItem[];
  journals: Journal[];
  expenses: Expense[];
  aiSummary: AIPlan | null;
  isFavorite: boolean;
  statistics: TripStatistics;
  isLoading: boolean;
  loadingAI: boolean;
  error: string | null;
}

const initialState: TripDetailState = {
  locations: [],
  gallery: [],
  journals: [],
  expenses: [],
  aiSummary: null,
  isFavorite: false,
  statistics: {
    totalLocations: 0,
    totalKm: 0,
    totalPhotos: 0,
    totalJournals: 0,
    totalExpenses: 0,
  },
  isLoading: false,
  loadingAI: false,
  error: null,
};

const getExpenseLabel = (expense: any) => {
  const value = (expense?.name || expense?.note || expense?.category || expense?.description || '').toString().trim();
  return value || 'Khoản chi phát sinh';
};

// ─── Thunks ───────────────────────────────────────────────────────────────────
export const fetchTripDetailData = createAsyncThunk(
  'tripDetail/fetchData',
  async (tripId: string, { rejectWithValue }) => {
    try {
      const [locRes, galRes, jourRes, expRes, aiRes] = await Promise.all([
        supabase.from('trip_locations').select('*').eq('trip_id', tripId).order('visit_date', { ascending: true }).order('visit_time', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('gallery').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
        supabase.from('journals').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
        supabase.from('trip_expenses').select('*').eq('trip_id', tripId),
        supabase.from('ai_plans').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }).limit(1),
      ]);

      // Bỏ qua lỗi non-critical (bảng chưa tồn tại)
      const locations = (locRes.data || []) as TripLocation[];
      const gallery = (galRes.data || []) as GalleryItem[];
      const journals = (jourRes.data || []).map((j: any) => ({
        ...j,
        date: j.created_at || j.date || new Date().toISOString()
      })) as Journal[];
      const expenses = (expRes.data || []).map((e: any) => ({
        id: e.id,
        trip_id: e.trip_id,
        name: getExpenseLabel(e),
        category: (e.category || '').toString().trim() || getExpenseLabel(e),
        amount: e.amount,
        description: (e.description || e.note || '').toString().trim() || getExpenseLabel(e),
        date: e.expense_date || e.date || '',
      })) as Expense[];
      const aiSummary = (aiRes.data?.[0] || null) as AIPlan | null;

      // Tính statistics
      const totalKm = locations.reduce((sum, l) => sum + (l.distance_from_previous || 0), 0);
      const statistics: TripStatistics = {
        totalLocations: locations.length,
        totalKm,
        totalPhotos: gallery.length,
        totalJournals: journals.length,
        totalExpenses: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      };

      return { locations, gallery, journals, expenses, aiSummary, statistics };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const generateAISummary = createAsyncThunk(
  'tripDetail/generateAI',
  async ({ tripId, tripContext }: { tripId: string; tripContext: string }, { rejectWithValue }) => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Tóm tắt chuyến đi này bằng tiếng Việt, trả lời ngắn gọn, súc tích và cảm hứng (tối đa 200 từ). Dữ liệu:\n${tripContext}` }] }],
          }),
        }
      );
      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || 'Không thể tạo tóm tắt.';

      // Lưu vào Supabase
      const { data, error } = await supabase
        .from('ai_plans')
        .insert([{ trip_id: tripId, generated_content: text }])
        .select()
        .single();
      if (error) throw error;
      return data as AIPlan;
    } catch (error: any) {
      return rejectWithValue(error.message || 'AI tạm thời không khả dụng.');
    }
  }
);

export const deleteTripCascade = createAsyncThunk(
  'tripDetail/deleteTrip',
  async (tripId: string, { rejectWithValue }) => {
    try {
      // Xóa cascade theo thứ tự
      await supabase.from('trip_locations').delete().eq('trip_id', tripId);
      await supabase.from('gallery').delete().eq('trip_id', tripId);
      await supabase.from('journals').delete().eq('trip_id', tripId);
      await supabase.from('trip_expenses').delete().eq('trip_id', tripId);
      await supabase.from('ai_plans').delete().eq('trip_id', tripId);
      const { error } = await supabase.from('trips').delete().eq('id', tripId);
      if (error) throw error;
      return tripId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────
const tripDetailSlice = createSlice({
  name: 'tripDetail',
  initialState,
  reducers: {
    clearTripDetail: (state) => {
      Object.assign(state, initialState);
    },
    setFavorite: (state, action: PayloadAction<boolean>) => {
      state.isFavorite = action.payload;
    },
    setAISummary: (state, action: PayloadAction<AIPlan>) => {
      state.aiSummary = action.payload;
    },
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
        state.aiSummary = action.payload.aiSummary;
        state.statistics = action.payload.statistics;
      })
      .addCase(fetchTripDetailData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(generateAISummary.pending, (state) => {
        state.loadingAI = true;
      })
      .addCase(generateAISummary.fulfilled, (state, action) => {
        state.loadingAI = false;
        state.aiSummary = action.payload;
      })
      .addCase(generateAISummary.rejected, (state) => {
        state.loadingAI = false;
      });
  },
});

export const { clearTripDetail, setFavorite, setAISummary } = tripDetailSlice.actions;
export default tripDetailSlice.reducer;
