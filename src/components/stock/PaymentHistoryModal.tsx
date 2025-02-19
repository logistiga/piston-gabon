import React from 'react';
import { X, AlertCircle, CreditCard, Wallet, Building2 } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';

interface Payment {
  id: string;
  payment_method: 'cash' | 'check' | 'bank_transfer';
  amount: number;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  bank_name?: string;
  check_number?: string;
}

interface PaymentHistoryModalProps {
  orderId: string;
  orderReference: string;
  supplierName: string;
  totalAmount: number;
  onClose: () => void;
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  orderId,
  orderReference,
  supplierName,
  totalAmount,
  onClose
}) => {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadPayments();
  }, [orderId]);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          payment_method,
          amount,
          payment_date,
          reference,
          notes,
          check_number,
          bank:banks(name)
        `)
        .eq('entity_type', 'purchase_order')
        .eq('entity_id', orderId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      setPayments(data?.map(p => ({
        ...p,
        bank_name: p.bank?.name
      })) || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = totalAmount - totalPaid;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Historique des Paiements</h2>
            <p className="text-sm text-gray-500">
              {orderReference} - {supplierName}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500">Montant total:</span>
              <span className="block text-lg font-semibold">{formatCurrency(totalAmount)}</span>
            </div>
            <div>
              <span className="text-gray-500">Montant payé:</span>
              <span className="block text-lg font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div>
              <span className="text-gray-500">Reste à payer:</span>
              <span className="block text-lg font-semibold text-red-600">
                {formatCurrency(remainingAmount)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Statut:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                remainingAmount <= 0 ? 'bg-green-100 text-green-800' :
                totalPaid > 0 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {remainingAmount <= 0 ? 'Payé' :
                 totalPaid > 0 ? 'Partiellement payé' :
                 'Non payé'}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Banque
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Chargement...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Aucun paiement enregistré
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                        payment.payment_method === 'check' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {payment.payment_method === 'cash' ? 'Espèces' :
                         payment.payment_method === 'check' ? 'Chèque' :
                         'Virement'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.reference || '-'}
                      {payment.check_number && (
                        <span className="text-gray-500 ml-2">
                          (Chèque n°{payment.check_number})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.bank_name || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;