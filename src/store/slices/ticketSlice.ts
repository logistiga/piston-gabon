import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchTickets, createTicket, updateTicket, deleteTicket } from '../../services/ticketService';
import type { 
  Ticket, 
  CreateTicketDTO, 
  UpdateTicketDTO, 
  PaginationParams,
  TicketFilters 
} from '../../services/ticketService';

interface TicketState {
  items: Ticket[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  currentPage: number;
  filters: TicketFilters;
}

const initialState: TicketState = {
  items: [],
  totalCount: 0,
  loading: false,
  error: null,
  currentPage: 1,
  filters: {},
};

const getTickets = createAsyncThunk(
  'tickets/getTickets',
  async ({ 
    pagination,
    filters 
  }: { 
    pagination: PaginationParams;
    filters?: TicketFilters;
  }) => {
    const response = await fetchTickets(pagination, filters);
    return response;
  }
);

const addTicket = createAsyncThunk(
  'tickets/addTicket',
  async (ticket: CreateTicketDTO) => {
    const response = await createTicket(ticket);
    return response;
  }
);

const editTicket = createAsyncThunk(
  'tickets/editTicket',
  async ({ id, data }: { id: string; data: UpdateTicketDTO }) => {
    const response = await updateTicket(id, data);
    return response;
  }
);

const removeTicket = createAsyncThunk(
  'tickets/removeTicket',
  async (id: string) => {
    await deleteTicket(id);
    return id;
  }
);

const ticketSlice = createSlice({
  name: 'tickets',
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
      state.currentPage = 1; // Reset to first page when filters change
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getTickets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTickets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.totalCount = action.payload.count;
      })
      .addCase(getTickets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      })
      .addCase(addTicket.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(editTicket.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(removeTicket.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.totalCount -= 1;
      });
  },
});

export const {    } = ticketSlice.actions;
export default ticketSlice.reducer;