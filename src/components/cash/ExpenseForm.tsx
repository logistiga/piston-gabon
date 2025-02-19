import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Search } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface ExpenseFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface Supplier {
  id: string;
  company_name: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    supplier_id: '',
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredSuppliers(
        suppliers.filter(supplier => 
          supplier.company_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredSuppliers([]);
    }
  }, [searchTerm, suppliers]);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setError('Erreur lors du chargement des fournisseurs');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.reason) {
      setError('Le montant et le motif sont requis');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: createError } = await supabase
        .from('cash_register')
        .insert([{
          operation_type: 'expense',
          amount: parseFloat(formData.amount),
          reason: formData.reason,
          supplier_id: formData.supplier_id || null,
          operation_date: new Date().toISOString(),
        }]);

      if (createError) throw createError;

      onSuccess?.();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Nouveau Décaissement</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className="input"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                min="0"
                step="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motif <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input min-h-[100px]"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fournisseur
              </label>
              <div className="relative">
                {selectedSupplier ? (
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <span>{selectedSupplier.company_name}</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, supplier_id: '' })}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className="input pl-10"
                      placeholder="Rechercher un fournisseur..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    
                    {filteredSuppliers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
                        <ul className="py-1 divide-y divide-gray-200">
                          {filteredSuppliers.map((supplier) => (
                            <li
                              key={supplier.id}
                              className="cursor-pointer hover:bg-gray-50 px-4 py-2"
                              onClick={() => {
                                setFormData({ ...formData, supplier_id: supplier.id });
                                setSearchTerm('');
                              }}
                            >
                              {supplier.company_name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⌛</span>
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;