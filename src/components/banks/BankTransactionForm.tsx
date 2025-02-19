import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';

interface Bank {
  id: string;
  name: string;
  account_number: string;
  balance: number;
}

interface BankTransactionFormProps {
  bank: Bank;
  onClose: () => void;
  onSuccess?: () => void;
}

const BankTransactionForm: React.FC<BankTransactionFormProps> = ({
  bank,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    type: 'deposit',
    amount: '',
    reference: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    if (formData.type === 'withdrawal' && amount > bank.balance) {
      setError(`Solde insuffisant pour effectuer ce retrait (${formatCurrency(bank.balance)})`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: createError } = await supabase
        .from('bank_transactions')
        .insert([{
          bank_id: bank.id,
          type: formData.type,
          amount: amount,
          reference: formData.reference || null,
          description: formData.description,
          date: new Date(formData.date).toISOString(),
          status: 'confirmed'
        }]);

      if (createError) throw createError;

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Erreur lors de la création de la transaction:', err);
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
            <div>
              <h2 className="text-xl font-semibold">
                {formData.type === 'deposit' ? 'Nouvel Encaissement' : 'Nouveau Décaissement'}
              </h2>
              <p className="text-sm text-gray-500">{bank.name}</p>
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

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900">{bank.name}</h3>
            <p className="text-sm text-gray-500">{bank.account_number}</p>
            <p className="mt-2 text-lg font-semibold">
              Solde: {formatCurrency(bank.balance)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type d'opération
              </label>
              <select
                className="input"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value="deposit">Encaissement</option>
                <option value="withdrawal">Décaissement</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant
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
                Date
              </label>
              <input
                type="date"
                className="input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Référence
              </label>
              <input
                type="text"
                className="input"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Numéro de bordereau, référence..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="input min-h-[100px]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de l'opération..."
                required
              />
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

export default BankTransactionForm;