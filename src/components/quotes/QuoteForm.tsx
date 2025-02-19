import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Save, CreditCard } from 'lucide-react';
import { supabase } from '../../config/supabase';
import ArticleSearch from '../articles/ArticleSearch';
import { useTaxes } from '../../hooks/useTaxes';
import TaxCalculator from '../taxes/TaxCalculator';
import ClientSearch from '../clients/ClientSearch';
import ArticleTable from '../articles/ArticleTable';
import { formatCurrency } from '../../utils/formatters';

interface QuoteFormProps {
  quoteId?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ quoteId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    client: null,
    items: [],
    notes: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { calculateTaxes } = useTaxes();

  useEffect(() => {
    if (quoteId) {
      loadQuote();
    }
  }, [quoteId]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (
            id,
            quantity,
            unit_price,
            discount,
            discount_type,
            article:articles(*)
          )
        `)
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      setFormData({
        client: {
          nom: quote.client_nom,
          email: quote.client_email,
          telephone: quote.client_telephone
        },
        items: quote.quote_items.map(item => ({
          ...item.article,
          quantity: item.quantity,
          discount: item.discount,
          discount_type: item.discount_type || 'percentage'
        })),
        notes: quote.notes || '',
        valid_until: quote.valid_until?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
    const existingItem = formData.items.find(item => item.id === article.id);
    
    if (existingItem) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      let quoteResult;

      if (quoteId) {
        // Update existing quote
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            client_nom: formData.client.nom,
            client_email: formData.client.email,
            client_telephone: formData.client.telephone,
            total: total,
            notes: formData.notes,
            valid_until: formData.valid_until
          })
          .eq('id', quoteId);

        if (updateError) throw updateError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', quoteId);

        if (deleteError) throw deleteError;

        quoteResult = { id: quoteId };
      } else {
        // Create new quote
        const { data: quote, error: quoteError } = await supabase
          .from('quotes')
          .insert([{
            client_nom: formData.client.nom,
            client_email: formData.client.email,
            client_telephone: formData.client.telephone,
            total: total,
            notes: formData.notes,
            valid_until: formData.valid_until
          }])
          .select()
          .single();

        if (quoteError) throw quoteError;
        quoteResult = quote;
      }

      // Create quote items
      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(
          formData.items.map(item => ({
            quote_id: quoteResult.id,
            article_id: item.id,
            quantity: item.quantity,
            unit_price: item.prixd,
            discount: item.discount,
            discount_type: item.discount_type
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
              {quoteId ? 'Modifier Devis' : 'Nouveau Devis'}
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
            <ClientSearch
              onSelect={(client) => setFormData(prev => ({ ...prev, client }))}
              selectedClient={formData.client}
              required
            />

            <div className="relative mb-4">
              <ArticleSearch
                onSelect={addItem}
                required
                allowZeroStock={true} // Allow zero stock articles in quotes
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de validité
                </label>
                <input
                  type="date"
                  className="input"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  required
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

export default QuoteForm;