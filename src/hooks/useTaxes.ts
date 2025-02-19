import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

interface Tax {
  id: string;
  name: string;
  rate: number;
  type: 'percentage' | 'fixed';
  is_active: boolean;
}

export const useTaxes = () => {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTaxes();
  }, []);

  const loadTaxes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: taxError } = await supabase
        .from('taxes')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (taxError) throw taxError;
      setTaxes(data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTaxes = (subtotal: number) => {
    return taxes.map(tax => ({
      id: tax.id,
      name: tax.name,
      rate: tax.rate,
      amount: tax.type === 'percentage' 
        ? (subtotal * tax.rate) / 100
        : tax.rate
    }));
  };

  return {
    taxes,
    loading,
    error,
    calculateTaxes
  };
};