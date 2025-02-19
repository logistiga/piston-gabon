import { supabase } from '../config/supabase';

export interface Client {
  id: string;
  nom: string;
  entreprise?: string;
  email: string;
  telephone: string;
  limite_credit: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClientDTO {
  nom: string;
  entreprise?: string;
  email: string;
  telephone: string;
  limite_credit: number;
}

export interface UpdateClientDTO extends Partial<CreateClientDTO> {}

export interface PaginationParams {
  page: number;
  perPage: number;
}

export const fetchClients = async (pagination?: PaginationParams): Promise<{ data: Client[]; count: number }> => {
  const { perPage = 10, page = 1 } = pagination || {};
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .range(start, end),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
  ]);

  if (error) throw new Error(error.message);
  if (countError) throw new Error(countError.message);

  return { 
    data: data || [], 
    count: count || 0 
  };
};

export const createClient = async (client: CreateClientDTO): Promise<Client> => {
  const { data, error } = await supabase
    .from('clients')
    .insert([client])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Un client avec cet email existe déjà');
    }
    throw new Error(error.message);
  }

  return data;
};

export const updateClient = async (id: string, client: UpdateClientDTO): Promise<Client> => {
  const { data, error } = await supabase
    .from('clients')
    .update(client)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Un client avec cet email existe déjà');
    }
    throw new Error(error.message);
  }

  return data;
};

export const deleteClient = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};