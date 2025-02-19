import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertCircle, Package, Eye, Printer, Truck, ChevronLeft, ChevronRight, Edit, Trash2, CreditCard, History } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';
import PurchaseOrderForm from './PurchaseOrderForm';
import PurchaseOrderPaymentForm from './PurchaseOrderPaymentForm';
import PaymentHistoryModal from './PaymentHistoryModal';

interface PurchaseOrder {
  id: string;
  reference: string;
  supplier_name: string;
  status: 'draft' | 'validated' | 'received' | 'cancelled';
  payment_status: 'pending' | 'partial' | 'paid';
  total_amount: number;
  paid_amount: number;
  expected_date: string | null;
  notes: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

const PurchaseOrderList: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    payment_status: '',
    dateStart: '',
    dateEnd: '',
  });

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('purchase_orders')
        .select('*', { count: 'exact' });

      // Apply filters
      if (searchTerm) {
        query = query.or(`reference.ilike.%${searchTerm}%,supplier_name.ilike.%${searchTerm}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }

      if (filters.dateStart) {
        query = query.gte('created_at', filters.dateStart);
      }

      if (filters.dateEnd) {
        query = query.lte('created_at', filters.dateEnd);
      }

      // Add pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error: fetchError, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      setOrders(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [currentPage, filters, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary p-2"
            title="Filtres"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvelle commande</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Référence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fournisseur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paiement
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date prévue
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {order.reference}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{order.supplier_name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    order.status === 'validated' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'received' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.status === 'draft' ? 'Brouillon' :
                     order.status === 'validated' ? 'Validée' :
                     order.status === 'received' ? 'Reçue' :
                     'Annulée'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.payment_status === 'partial' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {order.payment_status === 'pending' ? 'En attente' :
                     order.payment_status === 'partial' ? 'Partiel' :
                     'Payée'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {order.expected_date ? new Date(order.expected_date).toLocaleDateString() : '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowHistoryModal(true);
                    }}
                    className="btn btn-secondary p-2"
                    title="Historique des paiements"
                  >
                    <History className="h-4 w-4 text-blue-600" />
                  </button>

                  {/* N'afficher le bouton de paiement que si la commande n'est pas entièrement payée */}
                  {order.payment_status !== 'paid' && (
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowPaymentForm(true);
                      }}
                      className="btn btn-secondary p-2"
                      title="Effectuer un paiement"
                    >
                      <CreditCard className="h-4 w-4 text-green-600" />
                    </button>
                  )}

                  <button
                    className="btn btn-secondary p-2"
                    title="Voir les détails"
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>

                  <button
                    className="btn btn-secondary p-2"
                    title="Imprimer"
                  >
                    <Printer className="h-4 w-4 text-gray-600" />
                  </button>

                  <button
                    className="btn btn-secondary p-2"
                    title="Modifier"
                  >
                    <Edit className="h-4 w-4 text-orange-600" />
                  </button>

                  <button
                    className="btn btn-secondary p-2"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à{' '}
          {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} sur {totalCount} résultats
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary p-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage * ITEMS_PER_PAGE >= totalCount}
            className="btn btn-secondary p-2"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showCreateForm && (
        <PurchaseOrderForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadOrders();
          }}
        />
      )}

      {showPaymentForm && selectedOrder && (
        <PurchaseOrderPaymentForm
          order={selectedOrder}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            setShowPaymentForm(false);
            setSelectedOrder(null);
            loadOrders();
          }}
        />
      )}

      {showHistoryModal && selectedOrder && (
        <PaymentHistoryModal
          orderId={selectedOrder.id}
          orderReference={selectedOrder.reference}
          supplierName={selectedOrder.supplier_name}
          totalAmount={selectedOrder.total_amount}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default PurchaseOrderList;