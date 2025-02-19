import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import clientReducer from './slices/clientSlice';
import ticketReducer from './slices/ticketSlice';
import invoiceReducer from './slices/invoiceSlice';
import quoteReducer from './slices/quoteSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    clients: clientReducer,
    tickets: ticketReducer,
    invoices: invoiceReducer,
    quotes: quoteReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;