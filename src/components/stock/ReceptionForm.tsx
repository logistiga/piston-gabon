import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Save, DollarSign, Truck } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';

interface PurchaseOrder {
  id: string;
  reference: string;
  supplier_name: string;
  total_amount: number;
}

interface OrderItem {
  id: string;
  article_id: string;
  article: {
    nom: string;
    cb: string;
  };
  quantity: number;
  unit_price: number;
  transport_cost: number;
  total_cost: number;
}

interface ReceptionFormProps {
  order: PurchaseOrder;
  onClose: () => void;
  onSuccess?: () => void;
}

const ReceptionForm: React.FC<ReceptionFormProps> = ({
  order,
  onClose,
  onSuccess
}) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrderItems();
  }, [order.id]);

  const loadOrderItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          article:articles (
            id,
            cb,
            nom
          )
        `)
        .eq('purchase_order_id', order.id);

      if (itemsError) throw itemsError;
      setItems(data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateTransportCost = (itemId: string, cost: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const total = item.unit_price + cost;
        return { ...item, transport_cost: cost, total_cost: total };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      // Update order items with transport costs
      for (const item of items) {
        const { error: updateError } = await supabase
          .from('purchase_order_items')
          .update({
            transport_cost: item.transport_cost || 0
          })
          .eq('id', item.id);

        if (updateError) throw updateError;

        // Update article costs in inventory
        const { error: articleError } = await supabase
          .from('articles')
          .update({
            transport_cost: item.transport_cost || 0,
            prixa: item.unit_price,
            derniere_prix: (item.unit_price + (item.transport_cost || 0))
          })
          .eq('id', item.article_id);

        if (articleError) throw articleError;
      }

      // Update order status
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update({ status: 'received' })
        .eq('id', order.id);

      if (orderError) throw orderError;

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
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">Réception de Commande</h2>
              <p className="text-sm text-gray-500">{order.reference}</p>
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
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Fournisseur</p>
                <p className="font-medium">{order.supplier_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Montant Total</p>
                <p className="font-medium">{formatCurrency(order.total_amount)}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Article
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix Achat
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transport
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix Revient
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.article.nom}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.article.cb}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input w-24 text-right"
                          value={item.transport_cost || 0}
                          onChange={(e) => updateTransportCost(item.id, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap font-medium">
                        {formatCurrency((item.unit_price + (item.transport_cost || 0)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Valider la réception
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReceptionForm;