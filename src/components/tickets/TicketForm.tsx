import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Save, CreditCard } from 'lucide-react';
import { supabase } from '../../config/supabase';
import ArticleSearch from '../articles/ArticleSearch';
import { useTaxes } from '../../hooks/useTaxes';
import TaxCalculator from '../taxes/TaxCalculator';
import ClientSearch from '../clients/ClientSearch';
import ArticleTable from '../articles/ArticleTable';
import PaymentForm from '../payments/PaymentForm';
import { formatCurrency } from '../../utils/formatters';

interface TicketFormProps {
  ticketId?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const TicketForm: React.FC<TicketFormProps> = ({ ticketId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    client: null,
    items: [],
    notes: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newTicketId, setNewTicketId] = useState<string | null>(null);
  const [ticketAmount, setTicketAmount] = useState<number>(0);

  const { calculateTaxes } = useTaxes();

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_items (
            id,
            quantity,
            unit_price,
            discount,
            discount_type,
            article:articles(*)
          )
        `)
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      setFormData({
        client: {
          nom: ticket.client_nom,
          email: ticket.client_email,
          telephone: ticket.client_telephone
        },
        items: ticket.ticket_items.map(item => ({
          ...item.article,
          quantity: item.quantity,
          discount: item.discount,
          discount_type: item.discount_type || 'percentage'
        })),
        notes: ticket.notes || ''
      });

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = (item: any) => {
    const itemTotal = item.prixd * item.quantity;
    if (item.discount_type === 'percentage') {
      return itemTotal - (itemTotal * (item.discount || 0)) / 100;
    } else {
      return itemTotal - (item.discount || 0);
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateDiscountTotal = () => {
    return formData.items.reduce((sum, item) => {
      const itemTotal = item.prixd * item.quantity;
      if (item.discount_type === 'percentage') {
        return sum + (itemTotal * (item.discount || 0)) / 100;
      } else {
        return sum + (item.discount || 0);
      }
    }, 0);
  };

  const addItem = (article: any) => {
    // Check if article has enough stock
    if (article.stock <= 0) {
      setError('Cet article est en rupture de stock');
      return;
    }

    const existingItem = formData.items.find(item => item.id === article.id);
    
    if (existingItem) {
      // Check if increasing quantity would exceed stock
      if (existingItem.quantity + 1 > article.stock) {
        setError(`Stock insuffisant. Stock disponible: ${article.stock}`);
        return;
      }

      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === article.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
          ...article,
          quantity: 1,
          discount: 0,
          discount_type: 'percentage'
        }]
      }));
    }
  };

  const updateQuantity = (id: string, quantity: number) => {
    const item = formData.items.find(item => item.id === id);
    if (!item) return;

    // Check if new quantity exceeds stock
    if (quantity > item.stock) {
      setError(`Stock insuffisant. Stock disponible: ${item.stock}`);
      return;
    }

    if (quantity <= 0) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, quantity } : item
      )
    }));
  };

  const updateDiscount = (id: string, discount: number, discount_type: 'percentage' | 'fixed') => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          // Validate discount based on type
          let validDiscount = discount;
          if (discount_type === 'percentage') {
            validDiscount = Math.min(100, Math.max(0, discount));
          } else {
            const maxDiscount = item.prixd * item.quantity;
            validDiscount = Math.min(maxDiscount, Math.max(0, discount));
          }
          return { ...item, discount: validDiscount, discount_type };
        }
        return item;
      })
    }));
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleValidate = async (withPayment: boolean = false) => {
    if (!formData.client) {
      setError('Veuillez sélectionner un client');
      return;
    }

    if (formData.items.length === 0) {
      setError('Veuillez ajouter au moins un article');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const subtotal = calculateSubtotal();
      const taxes = calculateTaxes(subtotal);
      const total = taxes.reduce((sum, tax) => sum + tax.amount, subtotal);

      let ticketResult;

      if (ticketId) {
        // Update existing ticket
        const { error: updateError } = await supabase
          .from('tickets')
          .update({
            client_nom: formData.client.nom,
            client_email: formData.client.email,
            client_telephone: formData.client.telephone,
            montant: total,
            notes: formData.notes,
            statut: 'en_attente'
          })
          .eq('id', ticketId);

        if (updateError) throw updateError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('ticket_items')
          .delete()
          .eq('ticket_id', ticketId);

        if (deleteError) throw deleteError;

        ticketResult = { id: ticketId };
      } else {
        // Create new ticket
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .insert([{
            client_nom: formData.client.nom,
            client_email: formData.client.email,
            client_telephone: formData.client.telephone,
            montant: total,
            notes: formData.notes,
            statut: 'en_attente'
          }])
          .select()
          .single();

        if (ticketError) throw ticketError;
        ticketResult = ticket;
      }

      // Create ticket items and update stock
      for (const item of formData.items) {
        // Insert ticket item
        const { error: itemError } = await supabase
          .from('ticket_items')
          .insert([{
            ticket_id: ticketResult.id,
            article_id: item.id,
            quantity: item.quantity,
            unit_price: item.prixd,
            discount: item.discount,
            discount_type: item.discount_type
          }]);

        if (itemError) throw itemError;

        // Update article stock
        const { error: stockError } = await supabase
          .from('articles')
          .update({ 
            stock: item.stock - item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (stockError) throw stockError;
      }

      if (withPayment) {
        setNewTicketId(ticketResult.id);
        setTicketAmount(total);
        setShowPaymentForm(true);
      } else {
        onSuccess?.();
        onClose();
      }

    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {ticketId ? 'Modifier Ticket' : 'Nouveau Ticket'}
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

          <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
            <ClientSearch
              onSelect={(client) => setFormData(prev => ({ ...prev, client }))}
              selectedClient={formData.client}
              required
            />

            <div className="relative mb-4">
              <ArticleSearch
                onSelect={addItem}
                required
              />
            </div>

            <ArticleTable
              items={formData.items}
              onUpdateQuantity={updateQuantity}
              onUpdateDiscount={updateDiscount}
              onRemove={removeItem}
            />

            <div className="mt-4">
              <TaxCalculator 
                subtotal={calculateSubtotal()} 
                taxes={calculateTaxes(calculateSubtotal())}
                discountTotal={calculateDiscountTotal()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                className="input min-h-[100px]"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes ou commentaires..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => handleValidate(false)}
                className="btn bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                disabled={loading}
              >
                <Save className="h-5 w-5 mr-2" />
                Valider sans paiement
              </button>

              <button
                type="button"
                onClick={() => handleValidate(true)}
                className="btn btn-primary"
                disabled={loading}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Valider avec paiement
              </button>
            </div>
          </form>
        </div>
      </div>

      {showPaymentForm && newTicketId && (
        <PaymentForm
          entityType="ticket"
          entityId={newTicketId}
          totalAmount={ticketAmount}
          onClose={() => {
            setShowPaymentForm(false);
            onSuccess?.();
            onClose();
          }}
          onSuccess={() => {
            setShowPaymentForm(false);
            onSuccess?.();
            onClose();
          }}
        />
      )}
    </div>
  );
};

export default TicketForm;