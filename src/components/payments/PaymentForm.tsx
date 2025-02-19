import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CreditCard, Wallet, Building2 } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';

interface PaymentFormProps {
  entityType: 'ticket' | 'invoice' | 'purchase_order';
  entityId: string;
  totalAmount: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  entityType,
  entityId,
  totalAmount,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    paymentMethod: 'cash',
    amount: '',
    bankId: '',
    checkNumber: '',
    reference: '',
    notes: '',
  });

  const [banks, setBanks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [entityDetails, setEntityDetails] = useState<any>(null);
  const [remainingAmount, setRemainingAmount] = useState<number>(totalAmount);

  useEffect(() => {
    loadBanks();
    loadEntityDetails();
  }, [entityType, entityId]);

  const loadBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('id, name, balance')
        .order('name');

      if (error) throw error;
      setBanks(data || []);
    } catch (err) {
      console.error('Error loading banks:', err);
      setError('Erreur lors du chargement des banques');
    }
  };

  const loadEntityDetails = async () => {
    try {
      let data;
      let remaining = totalAmount;

      if (entityType === 'ticket') {
        const { data: ticket, error } = await supabase
          .from('ticket_payments_view')
          .select('*')
          .eq('ticket_id', entityId)
          .single();
        if (error) throw error;
        data = ticket;
        remaining = ticket.remaining_amount;
      } else if (entityType === 'invoice') {
        const { data: invoice, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', entityId)
          .single();
        if (error) throw error;
        data = invoice;
      } else if (entityType === 'purchase_order') {
        const { data: order, error } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('id', entityId)
          .single();
        if (error) throw error;
        data = order;
      }

      setEntityDetails(data);
      setRemainingAmount(remaining);
      setFormData(prev => ({
        ...prev,
        amount: remaining.toString()
      }));
    } catch (err) {
      console.error('Error loading entity details:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    if (amount > remainingAmount) {
      setError(`Le montant ne peut pas dépasser le reste à payer (${formatCurrency(remainingAmount)})`);
      return;
    }

    if (formData.paymentMethod !== 'cash' && !formData.bankId) {
      setError('Veuillez sélectionner une banque');
      return;
    }

    if (formData.paymentMethod === 'check' && !formData.checkNumber) {
      setError('Veuillez saisir le numéro du chèque');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          document_type: entityType,
          document_id: entityId,
          payment_method: formData.paymentMethod,
          amount: amount,
          total_amount: totalAmount,
          reference: formData.reference || null,
          notes: formData.notes || null,
          bank_id: formData.paymentMethod !== 'cash' ? formData.bankId : null,
          check_number: formData.paymentMethod === 'check' ? formData.checkNumber : null,
          payment_date: new Date().toISOString()
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create cash register entry if cash payment
      if (formData.paymentMethod === 'cash') {
        const { error: cashError } = await supabase
          .from('cash_register')
          .insert([{
            operation_type: entityType === 'purchase_order' ? 'expense' : 'income',
            amount: amount,
            payment_id: payment.id,
            reason: `Paiement ${entityType} ${entityDetails?.reference} - ${entityDetails?.client_nom || entityDetails?.supplier_name}`,
            reference: formData.reference || null,
            operation_date: new Date().toISOString()
          }]);

        if (cashError) throw cashError;
      }

      // Create bank transaction if bank payment
      if (formData.paymentMethod !== 'cash') {
        const { error: bankError } = await supabase
          .from('bank_transactions')
          .insert([{
            id: payment.id, // Use same ID as payment for linking
            bank_id: formData.bankId,
            type: 'payment',
            amount: amount,
            reference: formData.reference || null,
            description: `Paiement ${entityType} ${entityDetails?.reference} - ${entityDetails?.client_nom || entityDetails?.supplier_name}`,
            date: new Date().toISOString(),
            status: 'confirmed'
          }]);

        if (bankError) throw bankError;
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
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">Paiement</h2>
              <p className="text-sm text-gray-500">
                {entityType === 'ticket' ? 'Ticket' : 
                 entityType === 'invoice' ? 'Facture' : 
                 'Commande'} {entityDetails?.reference}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3 rounded">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="ml-2 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">
                  {entityType === 'purchase_order' ? 'Fournisseur:' : 'Client:'}
                </span>
                <span className="font-medium">
                  {entityType === 'purchase_order' 
                    ? entityDetails?.supplier_name 
                    : entityDetails?.client_nom}
                </span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Total à payer:</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              {remainingAmount !== totalAmount && (
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">Reste à payer:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(remainingAmount)}</span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode de paiement
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 ${
                    formData.paymentMethod === 'cash'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                >
                  <Wallet className="h-4 w-4 mb-1" />
                  <span className="text-xs">Espèces</span>
                </button>
                <button
                  type="button"
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 ${
                    formData.paymentMethod === 'check'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, paymentMethod: 'check' })}
                >
                  <CreditCard className="h-4 w-4 mb-1" />
                  <span className="text-xs">Chèque</span>
                </button>
                <button
                  type="button"
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 ${
                    formData.paymentMethod === 'bank_transfer'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, paymentMethod: 'bank_transfer' })}
                >
                  <Building2 className="h-4 w-4 mb-1" />
                  <span className="text-xs">Virement</span>
                </button>
              </div>
            </div>

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
                max={remainingAmount}
                step="1"
                required
              />
              {parseFloat(formData.amount) > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Restera à payer: {formatCurrency(remainingAmount - parseFloat(formData.amount))}
                </p>
              )}
            </div>

            {formData.paymentMethod !== 'cash' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banque <span className="text-red-500">*</span>
                </label>
                <select
                  className="input"
                  value={formData.bankId}
                  onChange={(e) => setFormData({ ...formData, bankId: e.target.value })}
                  required
                >
                  <option value="">Sélectionner une banque</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} ({formatCurrency(bank.balance)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.paymentMethod === 'check' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° Chèque <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.checkNumber}
                  onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Référence
              </label>
              <input
                type="text"
                className="input"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="N° bordereau, référence..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                className="input min-h-[60px]"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes ou commentaires..."
              />
            </div>

            <div className="flex justify-end gap-2">
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

export default PaymentForm;