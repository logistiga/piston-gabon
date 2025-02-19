import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchInvoices,
  createInvoice,
  createPayment,
  type Invoice,
  type CreateInvoiceDTO,
  type CreatePaymentDTO,
  type PaginationParams,
  type InvoiceFilters,
} from '../../services/invoiceService';

interface InvoiceState {
  items: Invoice[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  currentPage: number;
  filters: InvoiceFilters;
}

const initialState: InvoiceState = {
  items: [],
  totalCount: 0,
  loading: false,
  error: null,
  currentPage: 1,
  filters: {},
};

const getInvoices = createAsyncThunk(
  'invoices/getInvoices',
  async ({
    pagination,
    filters,
  }: {
    pagination: PaginationParams;
    filters?: InvoiceFilters;
  }) => {
    const response = await fetchInvoices(pagination, filters);
    return response;
  }
);

const addInvoice = createAsyncThunk(
  'invoices/addInvoice',
  async (invoice: CreateInvoiceDTO) => {
    const response = await createInvoice(invoice);
    return response;
  }
);

const addPayment = createAsyncThunk(
  'invoices/addPayment',
  async (payment: CreatePaymentDTO) => {
    const response = await createPayment(payment);
    return response;
  }
);

const invoiceSlice = createSlice({
  name: 'invoices',
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
      .addCase(getInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.totalCount = action.payload.count;
      })
      .addCase(getInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Une erreur est survenue';
      })
      .addCase(addInvoice.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(addPayment.fulfilled, (state) => {
        // Refresh the invoices list to get updated status
        state.currentPage = 1;
      });
  },
});

export const {    } = invoiceSlice.actions;
export default invoiceSlice.reducer;