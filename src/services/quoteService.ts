import { supabase } from '../config/supabase';

export interface Quote {
  id: string;
  reference: string;
  client_id: string;
  total: number;
  status: 'draft' | 'sent' | 'confirmed' | 'rejected';
  invoice_status: 'not_invoiced' | 'invoiced';
  valid_until: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface QuoteItem {
  id: string;
  quote_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteDTO {
  client_id: string;
  notes?: string;
  valid_until?: string;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    discount?: number;
  }>;
}

export interface UpdateQuoteDTO {
  notes?: string;
  valid_until?: string;
  status?: Quote['status'];
  invoice_status?: Quote['invoice_status'];
}

export interface QuoteFilters {
  reference?: string;
  client_id?: string;
  status?: Quote['status'];
  invoice_status?: Quote['invoice_status'];
  dateStart?: string;
  dateEnd?: string;
}

export interface PaginationParams {
  page: number;
  perPage: number;
}

export const fetchQuotes = async (
  pagination?: PaginationParams,
  filters?: QuoteFilters
): Promise<{ data: Quote[]; count: number }> => {
  const { perPage = 10, page = 1 } = pagination || {};
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  let query = supabase
    .from('quotes')
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
    if (filters.invoice_status) {
      query = query.eq('invoice_status', filters.invoice_status);
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

export const createQuote = async (quote: CreateQuoteDTO): Promise<Quote> => {
  const { data: quoteData, error: quoteError } = await supabase
    .from('quotes')
    .insert([{
      client_id: quote.client_id,
      notes: quote.notes,
      valid_until: quote.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      total: quote.items.reduce((sum, item) => {
        const itemTotal = item.unit_price * item.quantity;
        const discount = (itemTotal * (item.discount || 0)) / 100;
        return sum + (itemTotal - discount);
      }, 0),
    }])
    .select()
    .single();

  if (quoteError) {
    throw new Error(quoteError.message);
  }

  const { error: itemsError } = await supabase
    .from('quote_items')
    .insert(
      quote.items.map(item => ({
        quote_id: quoteData.id,
        ...item,
      }))
    );

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return quoteData;
};

export const updateQuote = async (id: string, data: UpdateQuoteDTO): Promise<Quote> => {
  const { data: quote, error } = await supabase
    .from('quotes')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return quote;
};

export const deleteQuote = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

const getQuoteItems = async (quoteId: string): Promise<QuoteItem[]> => {
  const { data, error } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};