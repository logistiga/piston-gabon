import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertCircle, Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Building2, Printer, Calendar } from 'lucide-react';
import { supabase } from '../../config/supabase';
import ExpenseForm from './ExpenseForm';
import { formatCurrency } from '../../utils/formatters';
import PrintCashReport from './PrintCashReport';

interface CashOperation {
  id: string;
  operation_type: 'income' | 'expense';
  amount: number;
  reason: string;
  reference_or_supplier: string | null;
  reference_type: 'reference' | 'supplier';
  operation_date: string;
  created_at: string;
  payment?: {
    entity_type: 'ticket' | 'invoice' | 'quote';
    entity_id: string;
    payment_method: 'cash' | 'check' | 'bank_transfer';
    amount: number;
    reference: string | null;
  } | null;
  client_nom?: string;
}

interface CashStats {
  totalBalance: number;
  dailyIncome: number;
  dailyExpense: number;
  dailyBankIncome: number;
  dailyBankExpense: number;
  totalBankBalance: number;
}

const CashRegister: React.FC = () => {
  const [operations, setOperations] = useState<CashOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPrintForm, setShowPrintForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState<CashStats>({
    totalBalance: 0,
    dailyIncome: 0,
    dailyExpense: 0,
    dailyBankIncome: 0,
    dailyBankExpense: 0,
    totalBankBalance: 0
  });
  const [filters, setFilters] = useState({
    type: '',
    dateStart: '',
    dateEnd: '',
  });

  useEffect(() => {
    loadOperations();
    loadStats();
  }, [filters, selectedDate]);

  const loadStats = async () => {
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get daily cash operations
      const { data: dailyOps } = await supabase
        .from('cash_register_details')
        .select('*')
        .gte('operation_date', today.toISOString())
        .lt('operation_date', tomorrow.toISOString());

      // Calculate daily stats
      const dailyStats = (dailyOps || []).reduce((acc, op) => {
        const amount = Number(op.amount);
        if (op.operation_type === 'income') {
          if (op.payment?.payment_method === 'cash') {
            acc.dailyIncome += amount;
          } else {
            acc.dailyBankIncome += amount;
          }
        } else {
          if (op.payment?.payment_method === 'cash') {
            acc.dailyExpense += amount;
          } else {
            acc.dailyBankExpense += amount;
          }
        }
        return acc;
      }, {
        dailyIncome: 0,
        dailyExpense: 0,
        dailyBankIncome: 0,
        dailyBankExpense: 0
      });

      // Get total cash balance
      const { data: allOps } = await supabase
        .from('cash_register_details')
        .select('*');

      const totalBalance = (allOps || []).reduce((sum, op) => {
        const amount = Number(op.amount);
        return sum + (op.operation_type === 'income' ? amount : -amount);
      }, 0);

      // Get total bank balance
      const { data: banks } = await supabase
        .from('banks')
        .select('balance');

      const totalBankBalance = (banks || []).reduce((sum, bank) => 
        sum + Number(bank.balance), 0);

      setStats({
        totalBalance,
        ...dailyStats,
        totalBankBalance
      });

    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadOperations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('cash_register_details')
        .select('*')
        .order('operation_date', { ascending: false });

      // Apply filters
      if (filters.type) {
        query = query.eq('operation_type', filters.type);
      }
      if (filters.dateStart) {
        query = query.gte('operation_date', filters.dateStart);
      }
      if (filters.dateEnd) {
        query = query.lte('operation_date', filters.dateEnd);
      }
      if (searchTerm) {
        query = query.or(`reason.ilike.%${searchTerm}%,reference_or_supplier.ilike.%${searchTerm}%,client_nom.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setOperations(data || []);
      
      // Calculate balance
      const total = (data || []).reduce((sum, op) => {
        const amount = Number(op.amount);
        return sum + (op.operation_type === 'income' ? amount : -amount);
      }, 0);
      
      setBalance(total);

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
      minute: '2-digit',
    });
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'ticket':
        return 'Ticket';
      case 'invoice':
        return 'Facture';
      case 'quote':
        return 'Devis';
      default:
        return type;
    }
  };

  const handlePrint = () => {
    setShowPrintForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Cash Balance */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Fonds de Caisse</p>
              <p className={`text-2xl font-bold ${stats.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.totalBalance)}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Depuis le début</p>
        </div>

        {/* Daily Income */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total des Encaissements</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.dailyIncome)}
              </p>
            </div>
            <ArrowUpRight className="h-8 w-8 text-green-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Aujourd'hui</p>
        </div>

        {/* Daily Expense */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total des Décaissements</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.dailyExpense)}
              </p>
            </div>
            <ArrowDownRight className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Aujourd'hui</p>
        </div>

        {/* Daily Bank Income */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Opérations Bancaires Reçues</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.dailyBankIncome)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-blue-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Aujourd'hui</p>
        </div>

        {/* Daily Bank Expense */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Opérations Bancaires Émises</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.dailyBankExpense)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-orange-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Aujourd'hui</p>
        </div>

        {/* Total Bank Balance */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Fonds des Banques</p>
              <p className={`text-2xl font-bold ${stats.totalBankBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.totalBankBalance)}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Depuis le début</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Gestion de la Caisse</h2>
          <p className="text-sm text-gray-500">
            Solde actuel: <span className={`font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(balance)}
            </span>
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
          <button
            onClick={handlePrint}
            className="btn btn-secondary"
          >
            <Printer className="h-5 w-5 mr-2" />
            Imprimer la caisse du jour
          </button>
          <button
            onClick={() => setShowExpenseForm(true)}
            className="btn btn-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau Décaissement
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une opération..."
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type d'opération
              </label>
              <select 
                className="input"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">Tous</option>
                <option value="income">Encaissement</option>
                <option value="expense">Décaissement</option>
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
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motif
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {operations.map((operation) => (
                <tr key={operation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(operation.operation_date)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {operation.operation_type === 'income' ? (
                        <ArrowUpRight className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      <span className={`text-sm font-medium ${
                        operation.operation_type === 'income' 
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                        {operation.operation_type === 'income' ? 'Encaissement' : 'Décaissement'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p>{operation.reason}</p>
                      {operation.payment && operation.client_nom && (
                        <p className="text-xs text-gray-500 mt-1">
                          Client: {operation.client_nom}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {operation.reference_or_supplier}
                    {operation.reference_type === 'reference' && operation.payment && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({getEntityLabel(operation.payment.entity_type)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <span className={operation.operation_type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {operation.operation_type === 'income' ? '+' : '-'} {formatCurrency(operation.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showExpenseForm && (
        <ExpenseForm
          onClose={() => setShowExpenseForm(false)}
          onSuccess={() => {
            setShowExpenseForm(false);
            loadOperations();
            loadStats();
          }}
        />
      )}

      {showPrintForm && (
        <PrintCashReport
          date={selectedDate}
          stats={stats}
          operations={operations}
          onClose={() => setShowPrintForm(false)}
        />
      )}
    </div>
  );
};

export default CashRegister;