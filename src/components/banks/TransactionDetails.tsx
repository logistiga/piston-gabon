import React from 'react';
import { X, AlertCircle, CreditCard, Wallet, Building2, Calendar, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface TransactionDetailsProps {
  transaction: any;
  onClose: () => void;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  transaction,
  onClose
}) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isIncome = transaction.type === 'deposit' || 
    (transaction.type === 'payment' && !transaction.description.toLowerCase().includes('commande'));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">Détails de la Transaction</h2>
              <p className="text-sm text-gray-500">{transaction.transaction_number}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Transaction Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <h3 className="font-medium">Date</h3>
                </div>
                <p>{formatDate(transaction.transaction_date)}</p>
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <h3 className="font-medium">Banque</h3>
                </div>
                <p>{transaction.bank_name}</p>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="card p-4 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-gray-400" />
                <h3 className="font-medium">Détails de l'opération</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{transaction.payment_type}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Montant</p>
                  <p className={`font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                    {isIncome ? '+ ' : '- '}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Statut</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {transaction.status_label}
                  </span>
                </div>

                {transaction.client_nom && (
                  <div>
                    <p className="text-sm text-gray-500">
                      {transaction.type === 'payment' && transaction.description.toLowerCase().includes('commande')
                        ? 'Fournisseur'
                        : 'Client'}
                    </p>
                    <p className="font-medium">{transaction.client_nom}</p>
                  </div>
                )}

                {transaction.reference_number && (
                  <div>
                    <p className="text-sm text-gray-500">N° Document</p>
                    <p className="font-medium">{transaction.reference_number}</p>
                  </div>
                )}

                {transaction.payment_reference && (
                  <div>
                    <p className="text-sm text-gray-500">Référence</p>
                    <p className="font-medium">{transaction.payment_reference}</p>
                  </div>
                )}

                {transaction.check_number && (
                  <div>
                    <p className="text-sm text-gray-500">N° Chèque</p>
                    <p className="font-medium">{transaction.check_number}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Description</p>
                <p className="mt-1">{transaction.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;