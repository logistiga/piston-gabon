import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface CompatibilityFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const CompatibilityForm: React.FC<CompatibilityFormProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    brand_id: '',
    name: '',
    year_start: '',
    year_end: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);

  React.useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('*')
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.brand_id || !formData.name) {
      setError('La marque et le nom du modèle sont requis');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: createError } = await supabase
        .from('vehicle_models')
        .insert([{
          brand_id: formData.brand_id,
          name: formData.name,
          year_start: formData.year_start ? parseInt(formData.year_start) : null,
          year_end: formData.year_end ? parseInt(formData.year_end) : null,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Nouveau Modèle</h2>
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
                Marque <span className="text-red-500">*</span>
              </label>
              <select
                className="input"
                value={formData.brand_id}
                onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                required
              >
                <option value="">Sélectionner une marque</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du Modèle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Année début
                </label>
                <input
                  type="number"
                  className="input"
                  value={formData.year_start}
                  onChange={(e) => setFormData({ ...formData, year_start: e.target.value })}
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Année fin
                </label>
                <input
                  type="number"
                  className="input"
                  value={formData.year_end}
                  onChange={(e) => setFormData({ ...formData, year_end: e.target.value })}
                  min="1900"
                  max={new Date().getFullYear()}
                />
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

export default CompatibilityForm;