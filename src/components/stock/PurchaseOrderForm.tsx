import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Save, Truck } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';

interface PurchaseOrderFormProps {
  orderId?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  orderId,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_date: '',
    notes: '',
    items: [] as Array<{
      article_id: string;
      quantity: number;
      unit_price: number;
      transport_cost: number;
    }>
  });

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSuppliers();
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('company_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setError('Erreur lors du chargement des fournisseurs');
    }
  };

  const loadOrder = async () => {
    try {
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          items:purchase_order_items (
            article_id,
            quantity,
            unit_price,
            transport_cost
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      setFormData({
        supplier_id: order.supplier_id,
        expected_date: order.expected_date?.split('T')[0] || '',
        notes: order.notes || '',
        items: order.items || []
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id) {
      setError('Veuillez sélectionner un fournisseur');
      return;
    }

    if (formData.items.length === 0) {
      setError('Veuillez ajouter au moins un article');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supplier = suppliers.find(s => s.id === formData.supplier_id);
      if (!supplier) throw new Error('Fournisseur non trouvé');

      const totalAmount = formData.items.reduce((sum, item) => {
        const itemTotal = item.unit_price * item.quantity;
        return sum + itemTotal;
      }, 0);

      let orderResult;

      if (orderId) {
        // Update existing order
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update({
            supplier_id: formData.supplier_id,
            supplier_name: supplier.company_name,
            expected_date: formData.expected_date || null,
            notes: formData.notes,
            total_amount: totalAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) throw updateError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', orderId);

        if (deleteError) throw deleteError;

        orderResult = { id: orderId };
      } else {
        // Create new order
        const { data: order, error: orderError } = await supabase
          .from('purchase_orders')
          .insert([{
            supplier_id: formData.supplier_id,
            supplier_name: supplier.company_name,
            expected_date: formData.expected_date || null,
            notes: formData.notes,
            status: 'draft',
            total_amount: totalAmount,
            payment_status: 'pending',
            paid_amount: 0
          }])
          .select()
          .single();

        if (orderError) throw orderError;
        orderResult = order;
      }

      // Create order items
      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(
          formData.items.map(item => ({
            purchase_order_id: orderResult.id,
            ...item
          }))
        );

      if (itemsError) throw itemsError;

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
            <h2 className="text-xl font-semibold">
              {orderId ? 'Modifier Commande' : 'Nouvelle Commande'}
            </h2>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fournisseur <span className="text-red-500">*</span>
              </label>
              <select
                className="input"
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                required
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date prévue de livraison
              </label>
              <input
                type="date"
                className="input"
                value={formData.expected_date}
                onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                className="input min-h-[100px]"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes ou commentaires..."
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
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Enregistrer
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

export default PurchaseOrderForm;