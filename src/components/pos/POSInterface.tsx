import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Printer, Save, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import ArticleSearch from '../articles/ArticleSearch';
import ClientSearch from '../clients/ClientSearch';
import { formatCurrency } from '../../utils/formatters';
import { useTaxes } from '../../hooks/useTaxes';
import TaxCalculator from '../taxes/TaxCalculator';
import PaymentForm from '../payments/PaymentForm';
import PrintButton from '../tickets/PrintButton';
import PrintDialog from './PrintDialog';

interface Article {
  id: string;
  cb: string;
  nom: string;
  prixd: number;
  stock: number;
  avatar?: string;
  description?: string;
  emplacement?: string;
  type_stock?: string;
}

interface CartItem extends Article {
  quantity: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
}

const POSInterface: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [ticketAmount, setTicketAmount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const { calculateTaxes } = useTaxes();

  useEffect(() => {
    return () => handleReset();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const addToCart = (article: Article) => {
    if (isReadOnly || !article) return;

    const existingItem = cartItems.find(item => item.id === article.id);
    
    if (existingItem) {
      setCartItems(prev => prev.map(item =>
        item.id === article.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems(prev => [...prev, {
        ...article,
        quantity: 1,
        discount: 0,
        discountType: 'percentage'
      }]);
    }

    setSelectedArticle(article);
  };

  const updateQuantity = (id: string, delta: number) => {
    if (isReadOnly || !id) return;

    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const updateDiscount = (id: string, discount: number, type: 'percentage' | 'fixed') => {
    if (isReadOnly || !id) return;

    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        if (type === 'percentage') {
          discount = Math.min(100, Math.max(0, discount));
        }
        else {
          const maxDiscount = item.prixd * item.quantity;
          discount = Math.min(maxDiscount, Math.max(0, discount));
        }
        return { ...item, discount, discountType: type };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    if (isReadOnly || !id) return;
    
    setCartItems(prev => prev.filter(item => item.id !== id));
    if (selectedArticle?.id === id) {
      setSelectedArticle(null);
    }
  };

  const calculateItemTotal = (item: CartItem) => {
    if (!item) return 0;
    
    const itemTotal = item.prixd * item.quantity;
    if (item.discountType === 'percentage') {
      const discount = (itemTotal * (item.discount || 0)) / 100;
      return itemTotal - discount;
    } else {
      return itemTotal - (item.discount || 0);
    }
  };

  const calculateDiscountTotal = () => {
    return cartItems.reduce((sum, item) => {
      const itemTotal = item.prixd * item.quantity;
      if (item.discountType === 'percentage') {
        return sum + (itemTotal * (item.discount || 0)) / 100;
      } else {
        return sum + (item.discount || 0);
      }
    }, 0);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const handleValidate = async (withPayment: boolean = false) => {
    if (cartItems.length === 0) {
      setError('Veuillez ajouter des articles au panier');
      return;
    }

    if (!selectedClient) {
      setError('Veuillez sélectionner un client');
      return;
    }

    try {
      setIsReadOnly(true);
      setError(null);

      const subtotal = calculateSubtotal();
      const taxes = calculateTaxes(subtotal);
      const total = taxes.reduce((sum, tax) => sum + tax.amount, subtotal);

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert([{
          client_nom: selectedClient.nom,
          client_email: selectedClient.email,
          client_telephone: selectedClient.telephone,
          montant: total,
          statut: 'en_attente'
        }])
        .select()
        .single();

      if (ticketError) throw ticketError;

      const { error: itemsError } = await supabase
        .from('ticket_items')
        .insert(
          cartItems.map(item => ({
            ticket_id: ticket.id,
            article_id: item.id,
            quantity: item.quantity,
            unit_price: item.prixd,
            discount: item.discount,
            discount_type: item.discountType
          }))
        );

      if (itemsError) throw itemsError;

      setTicketId(ticket.id);
      setTicketAmount(total);
      setIsValidated(true);

      if (withPayment) {
        setShowPaymentForm(true);
      }

    } catch (error) {
      setError('Une erreur est survenue lors de la création du ticket');
      setIsReadOnly(false);
    }
  };

  const handleReset = () => {
    setCartItems([]);
    setSelectedClient(null);
    setIsReadOnly(false);
    setTicketId(null);
    setSelectedArticle(null);
    setIsValidated(false);
    setTicketAmount(0);
    setError(null);
  };

  const handlePayment = () => {
    if (!ticketId) return;
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setShowPrintDialog(true);
  };

  const handlePrint = async (format: 'detailed' | 'pos') => {
    if (!ticketId) return;
    
    try {
      // Call the print function directly
      const printButton = document.querySelector(`button[data-format="${format}"]`);
      if (printButton) {
        printButton.click();
      }

      // Close dialog and reset after a short delay
      setTimeout(() => {
        setShowPrintDialog(false);
        handleReset();
      }, 500);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const subtotal = calculateSubtotal();
  const discountTotal = calculateDiscountTotal();
  const taxes = calculateTaxes(subtotal);
  const total = taxes.reduce((sum, tax) => sum + tax.amount, subtotal);

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <div className="container mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <ClientSearch
                onSelect={setSelectedClient}
                selectedClient={selectedClient}
                required
                showQuickAdd
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <ArticleSearch onSelect={addToCart} />
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Panier</h2>
                {cartItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Le panier est vide
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4 px-4 text-sm font-medium text-gray-500">
                      <div className="col-span-4">Article</div>
                      <div className="col-span-2 text-center">Quantité</div>
                      <div className="col-span-3 text-center">Remise</div>
                      <div className="col-span-2 text-right">Total</div>
                      <div className="col-span-1"></div>
                    </div>

                    {cartItems.map((item) => {
                      const finalTotal = calculateItemTotal(item);

                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-4">
                              <h3 className="font-medium">{item.nom}</h3>
                              <p className="text-sm text-gray-500">{item.cb}</p>
                            </div>

                            <div className="col-span-2 flex items-center justify-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="p-1 rounded-full hover:bg-gray-200"
                                disabled={isReadOnly}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="p-1 rounded-full hover:bg-gray-200"
                                disabled={isReadOnly}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="col-span-3 flex items-center justify-center gap-2">
                              <select
                                value={item.discountType}
                                onChange={(e) => updateDiscount(item.id, item.discount, e.target.value as 'percentage' | 'fixed')}
                                className="input w-24"
                                disabled={isReadOnly}
                              >
                                <option value="percentage">%</option>
                                <option value="fixed">FCFA</option>
                              </select>
                              <input
                                type="number"
                                min="0"
                                max={item.discountType === 'percentage' ? 100 : item.prixd * item.quantity}
                                value={item.discount || 0}
                                onChange={(e) => updateDiscount(item.id, parseFloat(e.target.value) || 0, item.discountType)}
                                className="input w-24 text-right"
                                placeholder="0"
                                disabled={isReadOnly}
                              />
                            </div>

                            <div className="col-span-2 text-right font-medium">
                              {formatCurrency(finalTotal)}
                            </div>

                            <div className="col-span-1 flex justify-end">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100"
                                disabled={isReadOnly}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {selectedArticle && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Détails de l'Article</h3>
                <div className="space-y-4">
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                    {selectedArticle.avatar ? (
                      <img 
                        src={selectedArticle.avatar}
                        alt={selectedArticle.nom}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-20 w-20 text-gray-400" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Code:</span>
                      <span className="font-medium">{selectedArticle.cb}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Prix:</span>
                      <span className="font-medium">{formatCurrency(selectedArticle.prixd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Stock:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedArticle.stock > 10 
                          ? 'bg-green-100 text-green-800'
                          : selectedArticle.stock > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedArticle.stock}
                      </span>
                    </div>
                    {selectedArticle.emplacement && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Emplacement:</span>
                        <span className="font-medium">{selectedArticle.emplacement}</span>
                      </div>
                    )}
                    {selectedArticle.type_stock && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span className="font-medium">
                          {selectedArticle.type_stock === 'O' ? 'Original' : 
                           selectedArticle.type_stock === 'N' ? 'Non Original' : 'Service'}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedArticle.description && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-500">{selectedArticle.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-6">
                <TaxCalculator 
                  subtotal={subtotal} 
                  taxes={taxes}
                  discountTotal={discountTotal}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-lg font-semibold">
            Total: {formatCurrency(total)}
          </div>
          
          <div className="flex gap-4">
            {!isValidated ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleValidate(false)}
                  className="btn bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                  disabled={cartItems.length === 0 || isReadOnly || !selectedClient}
                >
                  <Save className="h-5 w-5 mr-2" />
                  Valider sans encaissement
                </button>

                <button
                  onClick={() => handleValidate(true)}
                  disabled={cartItems.length === 0 || isReadOnly || !selectedClient}
                  className="btn btn-primary"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Valider avec encaissement
                </button>
              </div>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={handleReset}
                  className="btn btn-secondary"
                >
                  Nouveau ticket
                </button>

                <div className="flex gap-2">
                  <PrintButton
                    ticketId={ticketId!}
                    format="detailed"
                    onError={(err) => setError(err.message)}
                    className="btn btn-secondary"
                    data-format="detailed"
                  >
                    <Printer className="h-5 w-5 mr-2" />
                    Format A4
                  </PrintButton>

                  <PrintButton
                    ticketId={ticketId!}
                    format="pos"
                    onError={(err) => setError(err.message)}
                    className="btn btn-secondary"
                    data-format="pos"
                  >
                    <Printer className="h-5 w-5 mr-2" />
                    Format Ticket
                  </PrintButton>
                </div>

                <button
                  onClick={handlePayment}
                  className="btn btn-primary"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Encaisser
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPaymentForm && ticketId && (
        <PaymentForm
          entityType="ticket"
          entityId={ticketId}
          totalAmount={ticketAmount}
          onClose={() => {
            setShowPaymentForm(false);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showPrintDialog && ticketId && (
        <PrintDialog
          ticketId={ticketId}
          onClose={() => {
            setShowPrintDialog(false);
            handleReset();
          }}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
};

export default POSInterface;