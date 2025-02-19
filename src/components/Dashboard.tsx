import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Users, Ticket, FileText, TrendingUp, Calendar,
  ArrowUpRight, ArrowDownRight, CreditCard, Building2,
  Wallet, Package, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import type { RootState } from '../store';

interface DashboardStats {
  dailySales: number;
  dailyExpenses: number;
  activeClients: number;
  pendingPayments: number;
  lowStockItems: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  bankBalance: number;
  cashBalance: number;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState<DashboardStats>({
    dailySales: 0,
    dailyExpenses: 0,
    activeClients: 0,
    pendingPayments: 0,
    lowStockItems: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    bankBalance: 0,
    cashBalance: 0
  });
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [selectedDate, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get daily sales (from tickets and invoices)
      const [salesResult, invoiceResult] = await Promise.all([
        supabase
          .from('tickets')
          .select('montant')
          .eq('statut', 'payé')
          .gte('created_at', `${selectedDate}T00:00:00`)
          .lte('created_at', `${selectedDate}T23:59:59`),
        supabase
          .from('invoices')
          .select('total')
          .eq('status', 'payé')
          .gte('created_at', `${selectedDate}T00:00:00`)
          .lte('created_at', `${selectedDate}T23:59:59`)
      ]);

      if (salesResult.error) throw salesResult.error;
      if (invoiceResult.error) throw invoiceResult.error;

      // Calculate daily sales
      const dailySales = (salesResult.data || []).reduce((sum, t) => sum + (t.montant || 0), 0) +
                        (invoiceResult.data || []).reduce((sum, i) => sum + (i.total || 0), 0);

      // Get daily expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from('cash_register')
        .select('amount')
        .eq('operation_type', 'expense')
        .gte('operation_date', `${selectedDate}T00:00:00`)
        .lte('operation_date', `${selectedDate}T23:59:59`);

      if (expenseError) throw expenseError;

      const dailyExpenses = (expenseData || []).reduce((sum, e) => sum + (e.amount || 0), 0);

      // Get active clients count
      const { count: activeClients, error: clientError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      if (clientError) throw clientError;

      // Get pending payments
      const { data: pendingPayments, error: paymentError } = await supabase
        .from('invoices')
        .select('total')
        .eq('status', 'non_payé');

      if (paymentError) throw paymentError;

      const totalPendingPayments = (pendingPayments || []).reduce((sum, p) => sum + (p.total || 0), 0);

      // Get low stock items
      const { count: lowStockItems, error: stockError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 5);

      if (stockError) throw stockError;

      // Get bank balances
      const { data: bankData, error: bankError } = await supabase
        .from('banks')
        .select('balance');

      if (bankError) throw bankError;

      const totalBankBalance = (bankData || []).reduce((sum, b) => sum + (b.balance || 0), 0);

      // Get cash balance
      const { data: cashData, error: cashError } = await supabase
        .from('cash_register')
        .select('operation_type, amount');

      if (cashError) throw cashError;

      const cashBalance = (cashData || []).reduce((sum, op) => {
        return sum + (op.operation_type === 'income' ? op.amount : -op.amount);
      }, 0);

      // Update stats
      setStats({
        dailySales,
        dailyExpenses,
        activeClients: activeClients || 0,
        pendingPayments: totalPendingPayments,
        lowStockItems: lowStockItems || 0,
        monthlyRevenue: dailySales, // TODO: Calculate monthly
        monthlyProfit: dailySales - dailyExpenses, // TODO: Calculate monthly
        bankBalance: totalBankBalance,
        cashBalance
      });

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() - 1);
              setSelectedDate(date.toISOString().split('T')[0]);
            }}
            className="btn btn-secondary p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
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
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() + 1);
              setSelectedDate(date.toISOString().split('T')[0]);
            }}
            className="btn btn-secondary p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Daily Sales */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ventes du Jour</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.dailySales)}
              </p>
            </div>
            <ArrowUpRight className="h-8 w-8 text-green-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Aujourd'hui</p>
        </div>

        {/* Daily Expenses */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Dépenses du Jour</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.dailyExpenses)}
              </p>
            </div>
            <ArrowDownRight className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Aujourd'hui</p>
        </div>

        {/* Active Clients */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Clients Actifs</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.activeClients}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Total</p>
        </div>

        {/* Pending Payments */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Paiements en Attente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(stats.pendingPayments)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Total</p>
        </div>

        {/* Low Stock Items */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Articles en Rupture</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.lowStockItems}
              </p>
            </div>
            <Package className="h-8 w-8 text-orange-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Stock &lt; 5</p>
        </div>

        {/* Bank Balance */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Solde Bancaire</p>
              <p className={`text-2xl font-bold ${stats.bankBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.bankBalance)}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Total</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/pos" className="card p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 p-3 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-medium">Point de Vente</h3>
              <p className="text-sm text-gray-500">Créer un ticket</p>
            </div>
          </div>
        </Link>

        <Link to="/invoices" className="card p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">Factures</h3>
              <p className="text-sm text-gray-500">Gérer les factures</p>
            </div>
          </div>
        </Link>

        <Link to="/quotes" className="card p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">Devis</h3>
              <p className="text-sm text-gray-500">Créer un devis</p>
            </div>
          </div>
        </Link>

        <Link to="/purchase-orders" className="card p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium">Commandes</h3>
              <p className="text-sm text-gray-500">Gérer les commandes</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Ventes Récentes</h2>
          <div className="space-y-4">
            {/* TODO: Add recent sales list */}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Alertes Stock</h2>
          <div className="space-y-4">
            {/* TODO: Add low stock alerts list */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;