import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, Package, Eye, Printer, Truck, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';
import ReceptionForm from './ReceptionForm';
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

const PurchaseOrderReception: React.FC = () => {
  const [pendingOrders, setPendingOrders] = useState<PurchaseOrder[]>([]);
  const [receivedOrders, setReceivedOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReceptionForm, setShowReceptionForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
  });

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('purchase_orders')
        .select('*')
        .in('status', ['validated', 'received']);

      if (searchTerm) {
        query = query.or(`reference.ilike.%${searchTerm}%,supplier_name.ilike.%${searchTerm}%`);
      }

      if (filters.dateStart) {
        query = query.gte('created_at', filters.dateStart);
      }
      if (filters.dateEnd) {
        query = query.lte('created_at', filters.dateEnd);
      }

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Split orders into pending and received
      const pending: PurchaseOrder[] = [];
      const received: PurchaseOrder[] = [];

      (data || []).forEach(order => {
        if (order.status === 'validated') {
          pending.push(order);
        } else if (order.status === 'received') {
          received.push(order);
        }
      });

      setPendingOrders(pending);
      setReceivedOrders(received);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [searchTerm, filters]);

  const handleViewHistory = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowHistoryModal(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPaymentStatusBadge = (status: string, paidAmount: number, totalAmount: number) => {
    if (status === 'paid' || paidAmount >= totalAmount) {
      return 'bg-green-100 text-green-800';
    }
    if (paidAmount > 0) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-red-100 text-red-800';
  };

  const getPaymentStatusLabel = (status: string, paidAmount: number, totalAmount: number) => {
    if (status === 'paid' || paidAmount >= totalAmount) {
      return 'Payé';
    }
    if (paidAmount > 0) {
      return `Payé: ${formatCurrency(paidAmount)}`;
    }
    return 'Non payé';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const renderOrderList = (orders: PurchaseOrder[], title: string, showReceptionButton: boolean = false) => {
    if (orders.length === 0) return null;

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="card divide-y divide-gray-200">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    {order.reference}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadge(order.payment_status, order.paid_amount, order.total_amount)}`}>
                    {getPaymentStatusLabel(order.payment_status, order.paid_amount, order.total_amount)}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </span>
                  {order.paid_amount > 0 && (
                    <span className="text-green-600">
                      Payé: {formatCurrency(order.paid_amount)}
                    </span>
                  )}
                  <span className="text-gray-500">
                    {formatDate(order.created_at)}
                  </span>
                  <span className="text-gray-500">
                    Fournisseur: {order.supplier_name}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleViewHistory(order)}
                  className="btn btn-secondary"
                  title="Historique des paiements"
                >
                  <History className="h-4 w-4 text-blue-600" />
                </button>

                <button
                  onClick={() => handleViewHistory(order)}
                  className="btn btn-secondary"
                  title="Voir les détails"
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </button>

                <button
                  onClick={() => handleViewHistory(order)}
                  className="btn btn-secondary"
                  title="Imprimer"
                >
                  <Printer className="h-4 w-4 text-gray-600" />
                </button>

                {showReceptionButton && (
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowReceptionForm(true);
                    }}
                    className="btn btn-primary"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Réceptionner
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réception des Commandes</h1>
          <p className="text-sm text-gray-500">
            {pendingOrders.length} commande{pendingOrders.length !== 1 ? 's' : ''} en attente
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une commande..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <div className="space-y-8">
        {/* Pending Orders */}
        {renderOrderList(pendingOrders, 'Commandes en Attente de Réception', true)}

        {/* Received Orders */}
        {renderOrderList(receivedOrders, 'Commandes Réceptionnées')}

        {/* Show message if no orders */}
        {pendingOrders.length === 0 && receivedOrders.length === 0 && (
          <div className="card p-6 text-center text-gray-500">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2">Aucune commande trouvée</p>
          </div>
        )}
      </div>

      {showReceptionForm && selectedOrder && (
        <ReceptionForm
          order={selectedOrder}
          onClose={() => {
            setShowReceptionForm(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            setShowReceptionForm(false);
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

export default PurchaseOrderReception;