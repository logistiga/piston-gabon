import { supabase } from '../config/supabase';
import type { Supplier } from '../types/supplier';

interface PaginationParams {
  page: number;
  perPage: number;
}

interface SupplierFilters {
  search?: string;
  country?: string;
  city?: string;
  status?: 'active' | 'inactive';
}

export const fetchSuppliers = async (
  pagination?: PaginationParams,
  filters?: SupplierFilters
): Promise<{ data: Supplier[]; count: number }> => {
  const { perPage = 20, page = 1 } = pagination || {};
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  let query = supabase
    .from('suppliers')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters) {
    if (filters.search) {
      query = query.or(
        `company_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`
      );
    }
    if (filters.country) {
      query = query.eq('country', filters.country);
    }
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
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

export const createSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([supplier])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

const updateSupplier = async (id: string, supplier: Partial<Supplier>): Promise<Supplier> => {
  const { data, error } = await supabase
    .from('suppliers')
    .update(supplier)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

const deleteSupplier = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};