import { supabase } from '../config/supabase';

export interface Ticket {
  id: string;
  description: string;
  montant: number;
  statut: 'en attente' | 'payé' | 'annulé';
  facture: boolean;
  client_id?: string;
  reference: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketDTO {
  description: string;
  montant: number;
  client_id?: string;
}

export interface UpdateTicketDTO {
  description?: string;
  montant?: number;
  statut?: Ticket['statut'];
  facture?: boolean;
  client_id?: string;
}

export interface TicketFilters {
  reference?: string;
  client_id?: string;
  statut?: Ticket['statut'];
  facture?: boolean;
  dateStart?: string;
  dateEnd?: string;
}

export interface PaginationParams {
  page: number;
  perPage: number;
}

export const fetchTickets = async (
  pagination?: PaginationParams,
  filters?: TicketFilters
): Promise<{ data: Ticket[]; count: number }> => {
  const { perPage = 10, page = 1 } = pagination || {};
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  let query = supabase
    .from('tickets')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters) {
    if (filters.reference) {
      query = query.ilike('reference', `%${filters.reference}%`);
    }
    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters.statut) {
      query = query.eq('statut', filters.statut);
    }
    if (filters.facture !== undefined) {
      query = query.eq('facture', filters.facture);
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

export const createTicket = async (ticket: CreateTicketDTO): Promise<Ticket> => {
  // Generate a unique reference number (YYYYMMDD-XXXX)
  const reference = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data, error } = await supabase
    .from('tickets')
    .insert([{
      ...ticket,
      reference,
      statut: 'en attente',
      facture: false,
    }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateTicket = async (id: string, data: UpdateTicketDTO): Promise<Ticket> => {
  // If status is changed to 'payé', automatically set facture to true
  const updates = {
    ...data,
    ...(data.statut === 'payé' && { facture: true }),
  };

  const { data: ticket, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return ticket;
};

export const deleteTicket = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};