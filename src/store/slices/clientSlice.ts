import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchClients, createClient, updateClient, deleteClient } from '../../services/clientService';
import type { Client, CreateClientDTO, UpdateClientDTO, PaginationParams } from '../../services/clientService';

interface ClientState {
  items: Client[];
  totalCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: ClientState = {
  items: [],
  totalCount: 0,
  loading: false,
  error: null,
};

const getClients = createAsyncThunk(
  'clients/getClients',
  async (pagination: PaginationParams) => {
    const response = await fetchClients(pagination);
    return response;
  }
);

const addClient = createAsyncThunk(
  'clients/addClient',
  async (client: CreateClientDTO) => {
    const response = await createClient(client);
    return response;
  }
);

const editClient = createAsyncThunk(
  'clients/editClient',
  async ({ id, data }: { id: string; data: UpdateClientDTO }) => {
    const response = await updateClient(id, data);
    return response;
  }
);

const removeClient = createAsyncThunk(
  'clients/removeClient',
  async (id: string) => {
    await deleteClient(id);
    return id;
  }
);

const clientSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getClients.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.totalCount = action.payload.count;
      })
      .addCase(getClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      })
      .addCase(addClient.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(editClient.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(removeClient.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.totalCount -= 1;
      });
  },
});

export const {  } = clientSlice.actions;
export default clientSlice.reducer;