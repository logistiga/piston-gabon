import React, { useState } from 'react';
import { X, AlertCircle, Building2, Mail, Phone, CreditCard, User, FileText, MapPin } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface ClientFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  client?: {
    id: string;
    client_id?: string;
    nom: string;
    entreprise?: string;
    email?: string;
    telephone?: string;
    limite_credit: number;
    nif?: string;
    adresse?: string;
  } | null;
}

const ClientForm: React.FC<ClientFormProps> = ({ onClose, onSuccess, client }) => {
  const [formData, setFormData] = useState({
    nom: client?.nom || '',
    entreprise: client?.entreprise || '',
    email: client?.email || '',
    telephone: client?.telephone || '',
    limite_credit: client?.limite_credit?.toString() || '0',
    nif: client?.nif || '',
    adresse: client?.adresse || '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom) {
      setError('Le nom est requis');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = {
        nom: formData.nom,
        entreprise: formData.entreprise || null,
        email: formData.email || null,
        telephone: formData.telephone || null,
        limite_credit: parseFloat(formData.limite_credit) || 0,
        nif: formData.nif || null,
        adresse: formData.adresse || null,
      };

      if (client) {
        // Update existing client
        const { error: updateError } = await supabase
          .from('clients')
          .update(data)
          .eq('id', client.id);

        if (updateError) throw updateError;
      } else {
        // Create new client
        const { error: createError } = await supabase
          .from('clients')
          .insert([data])
          .select()
          .single();

        if (createError) throw createError;
      }

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
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {client ? (
                  <>
                    <Building2 className="h-6 w-6 text-primary-600" />
                    Modifier le Client
                    {client.client_id && (
                      <span className="text-sm text-gray-500">({client.client_id})</span>
                    )}
                  </>
                ) : (
                  <>
                    <User className="h-6 w-6 text-primary-600" />
                    Nouveau Client
                  </>
                )}
              </h2>
            </div>
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
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entreprise
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="input pl-10"
                    value={formData.entreprise}
                    onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                    placeholder="Nom de l'entreprise (optionnel)"
                  />
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      className="input pl-10"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      className="input pl-10"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="+241 XX XX XX XX"
                    />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIF
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input pl-10"
                      value={formData.nif}
                      onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                      placeholder="Numéro d'identification fiscale"
                    />
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limite de crédit
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="input pl-10"
                      value={formData.limite_credit}
                      onChange={(e) => setFormData({ ...formData, limite_credit: e.target.value })}
                      min="0"
                      step="1000"
                      placeholder="0"
                    />
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <div className="relative">
                  <textarea
                    className="input pl-10 min-h-[80px]"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Adresse physique du client"
                  />
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
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

export default ClientForm;