import { supabase } from '../config/supabase';

export interface Invoice {
  id: string;
  reference: string;
  ticket_id: string;
  client_id: string;
  total: number;
  status: 'payé' | 'non_payé';
  payment_date: string | null;
  due_date: string;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: 'espèces' | 'virement' | 'chèque' | 'mobile_money';
  payment_date: string;
  created_at: string;
}

export interface CreateInvoiceDTO {
  ticket_id: string;
  client_id: string;
  total: number;
  due_date?: string;
}

export interface CreatePaymentDTO {
  invoice_id: string;
  amount: number;
  payment_method: Payment['payment_method'];
  payment_date?: string;
}

export interface InvoiceFilters {
  reference?: string;
  client_id?: string;
  status?: Invoice['status'];
  dateStart?: string;
  dateEnd?: string;
}

export interface PaginationParams {
  page: number;
  perPage: number;
}

export const fetchInvoices = async (
  pagination?: PaginationParams,
  filters?: InvoiceFilters
): Promise<{ data: Invoice[]; count: number }> => {
  const { perPage = 10, page = 1 } = pagination || {};
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters) {
    if (filters.reference) {
      query = query.ilike('reference', `%${filters.reference}%`);
    }
    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.dateStart) {
      query = query.gte('created_at', filters.dateStart);
    }
    if (filters.dateEnd) {
      query = query.lte('created_at', filters.dateEnd);
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(start, end);

  if (error) {
    throw new Error(error.message);
  }

  return {
    data: data || [],
    count: count || 0,
  };
};

export const createInvoice = async (invoice: CreateInvoiceDTO): Promise<Invoice> => {
  // Generate a unique reference number (FA_XXXXXX)
  const reference = `FA_${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

  const { data, error } = await supabase
    .from('invoices')
    .insert([{
      ...invoice,
      reference,
      status: 'non_payé',
    }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const createPayment = async (payment: CreatePaymentDTO): Promise<Payment> => {
  const { data, error } = await supabase
    .from('payments')
    .insert([payment])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

const getInvoicePayments = async (invoiceId: string): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};