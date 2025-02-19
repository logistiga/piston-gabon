import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertCircle, Eye, ArrowUpRight, ArrowDownRight, CreditCard, Building2, Calendar } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';
import BankTransactionForm from './BankTransactionForm';
import TransactionDetails from './TransactionDetails';

interface Bank {
  id: string;
  name: string;
  account_number: string;
  balance: number;
}

interface BankTransaction {
  id: string;
  transaction_number: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment';
  amount: number;
  description: string;
  reference_number: string;
  transaction_date: string;
  status: 'pending' | 'confirmed' | 'rejected';
  payment_type: string;
  client_nom?: string;
  bank_name: string;
  status_label: string;
  check_number?: string;
  payment_reference?: string;
}

const BankTransactions: React.FC = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    dateStart: '',
    dateEnd: '',
  });

  useEffect(() => {
    loadBanks();
    loadTransactions();
  }, [searchTerm, filters, selectedDate]);

  const loadBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name');

      if (error) throw error;
      setBanks(data || []);
    } catch (err) {
      console.error('Error loading banks:', err);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('bank_transactions_details')
        .select('*');

      // Filtrer par date sélectionnée
      if (selectedDate) {
        query = query.eq('transaction_date', selectedDate);
      }

      // Appliquer les filtres
      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%,client_nom.ilike.%${searchTerm}%`);
      }

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.dateStart) {
        query = query.gte('transaction_date', filters.dateStart);
      }

      if (filters.dateEnd) {
        query = query.lte('transaction_date', filters.dateEnd);
      }

      const { data, error: fetchError } = await query
        .order('transaction_date', { ascending: false });

      if (fetchError) throw fetchError;
      setTransactions(data || []);

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
    });
  };

  // Calculer les totaux journaliers
  const dailyTotals = transactions.reduce((acc, t) => {
    const amount = Math.abs(t.amount);
    if (t.type === 'deposit' || (t.type === 'payment' && !t.description.toLowerCase().includes('commande'))) {
      acc.income += amount;
    } else if (t.type === 'withdrawal' || (t.type === 'payment' && t.description.toLowerCase().includes('commande'))) {
      acc.expense += amount;
    }
    return acc;
  }, { income: 0, expense: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Soldes des banques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banks.map(bank => (
          <div key={bank.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{bank.name}</h3>
                <p className="text-sm text-gray-500">{bank.account_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Solde</p>
                <p className={`text-xl font-bold ${bank.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(bank.balance)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setSelectedBank(bank);
                  setShowTransactionForm(true);
                }}
                className="btn btn-primary flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Transaction
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Transactions Bancaires</h2>
          <p className="text-sm text-gray-500">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white rounded-md border p-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              className="border-none focus:ring-0"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Cartes de résumé */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Encaissements du Jour</p>
              <p className="text-2xl font-bold text-green-600">
                + {formatCurrency(dailyTotals.income)}
              </p>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <ArrowUpRight className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Décaissements du Jour</p>
              <p className="text-2xl font-bold text-red-600">
                - {formatCurrency(dailyTotals.expense)}
              </p>
            </div>
            <div className="bg-red-100 p-2 rounded-full">
              <ArrowDownRight className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Solde du Jour</p>
              <p className={`text-2xl font-bold ${dailyTotals.income - dailyTotals.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(dailyTotals.income - dailyTotals.expense)}
              </p>
            </div>
            <div className="bg-blue-100 p-2 rounded-full">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une transaction..."
              className="input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary"
        >
          <Filter className="h-5 w-5 mr-2" />
          Filtres
        </button>
      </div>

      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                className="input"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">Tous</option>
                <option value="deposit">Encaissement</option>
                <option value="withdrawal">Décaissement</option>
                <option value="transfer">Virement</option>
                <option value="payment">Paiement</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                className="input"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Tous</option>
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmé</option>
                <option value="rejected">Rejeté</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date début
              </label>
              <input
                type="date"
                className="input"
                value={filters.dateStart}
                onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                type="date"
                className="input"
                value={filters.dateEnd}
                onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Document
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => {
                // Determine if this is an income transaction (encaissement)
                const isIncome = transaction.type === 'deposit' || 
                  (transaction.type === 'payment' && !transaction.description.toLowerCase().includes('commande'));
                
                return (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'payment' && transaction.description.toLowerCase().includes('commande') 
                          ? 'Décaissement'
                          : transaction.payment_type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {transaction.type === 'payment' && transaction.description.toLowerCase().includes('commande')
                          ? transaction.description.replace('Paiement', 'Décaissement')
                          : transaction.description}
                      </div>
                      {transaction.check_number && (
                        <div className="text-xs text-gray-500 mt-1">
                          Chèque n°{transaction.check_number}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.reference_number || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status_label}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={isIncome ? 'text-green-600' : 'text-red-600'}>
                        {isIncome ? '+ ' : '- '}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                      <button
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowTransactionDetails(true);
                        }}
                        className="btn btn-secondary p-2"
                        title="Voir les détails"
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showTransactionForm && selectedBank && (
        <BankTransactionForm
          bank={selectedBank}
          onClose={() => {
            setShowTransactionForm(false);
            setSelectedBank(null);
          }}
          onSuccess={() => {
            setShowTransactionForm(false);
            setSelectedBank(null);
            loadBanks();
            loadTransactions();
          }}
        />
      )}

      {showTransactionDetails && selectedTransaction && (
        <TransactionDetails
          transaction={selectedTransaction}
          onClose={() => {
            setShowTransactionDetails(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
};

export default BankTransactions;