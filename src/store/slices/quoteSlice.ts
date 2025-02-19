import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
  type Quote,
  type CreateQuoteDTO,
  type UpdateQuoteDTO,
  type PaginationParams,
  type QuoteFilters,
} from '../../services/quoteService';

interface QuoteState {
  items: Quote[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  currentPage: number;
  filters: QuoteFilters;
}

const initialState: QuoteState = {
  items: [],
  totalCount: 0,
  loading: false,
  error: null,
  currentPage: 1,
  filters: {},
};

const getQuotes = createAsyncThunk(
  'quotes/getQuotes',
  async ({
    pagination,
    filters,
  }: {
    pagination: PaginationParams;
    filters?: QuoteFilters;
  }) => {
    const response = await fetchQuotes(pagination, filters);
    return response;
  }
);

const addQuote = createAsyncThunk(
  'quotes/addQuote',
  async (quote: CreateQuoteDTO) => {
    const response = await createQuote(quote);
    return response;
  }
);

const editQuote = createAsyncThunk(
  'quotes/editQuote',
  async ({ id, data }: { id: string; data: UpdateQuoteDTO }) => {
    const response = await updateQuote(id, data);
    return response;
  }
);

const removeQuote = createAsyncThunk(
  'quotes/removeQuote',
  async (id: string) => {
    await deleteQuote(id);
    return id;
  }
);

const quoteSlice = createSlice({
  name: 'quotes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = action.payload;
      state.currentPage = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getQuotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getQuotes.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.totalCount = action.payload.count;
      })
      .addCase(getQuotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      })
      .addCase(addQuote.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(editQuote.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(removeQuote.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.totalCount -= 1;
      });
  },
});

export const {    } = quoteSlice.actions;
export default quoteSlice.reducer;