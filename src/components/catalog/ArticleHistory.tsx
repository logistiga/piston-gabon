import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, History, Truck, ShoppingCart } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';

interface ArticleHistoryProps {
  articleId: string;
  onClose: () => void;
}

interface SaleHistory {
  id: string;
  date: string;
  document_type: 'ticket' | 'invoice';
  document_reference: string;
  client_nom: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface PurchaseHistory {
  id: string;
  purchase_date: string;
  supplier_name: string;
  quantity: number;
  unit_price: number;
  transport_cost: number;
  total_cost: number;
  order_reference: string;
  status: 'draft' | 'validated' | 'received' | 'cancelled';
}

const ArticleHistory: React.FC<ArticleHistoryProps> = ({ articleId, onClose }) => {
  const [article, setArticle] = useState<any>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [saleHistory, setSaleHistory] = useState<SaleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'purchases' | 'sales'>('info');

  useEffect(() => {
    loadArticleDetails();
  }, [articleId]);

  const loadArticleDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load article details
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .select(`
          *,
          category:categories(name),
          brand:brands(name),
          references:article_references(*)
        `)
        .eq('id', articleId)
        .single();

      if (articleError) throw articleError;
      setArticle(article);

      // Charger l'historique des achats depuis les commandes
      const { data: purchases, error: purchaseError } = await supabase
        .from('purchase_order_items')
        .select(`
          id,
          quantity,
          unit_price,
          transport_cost,
          purchase_order:purchase_orders(
            reference,
            supplier_name,
            status,
            created_at
          )
        `)
        .eq('article_id', articleId)
        .order('created_at', { ascending: false });

      if (purchaseError) throw purchaseError;

      // Formater l'historique des achats
      const formattedPurchases = (purchases || [])
        .filter((p: any) => p.purchase_order)
        .map((p: any) => ({
          id: p.id,
          purchase_date: p.purchase_order.created_at,
          supplier_name: p.purchase_order.supplier_name,
          quantity: p.quantity,
          unit_price: p.unit_price,
          transport_cost: p.transport_cost || 0,
          total_cost: (p.unit_price + (p.transport_cost || 0)) * p.quantity,
          order_reference: p.purchase_order.reference,
          status: p.purchase_order.status
        }));

      setPurchaseHistory(formattedPurchases);

      // Load sales from tickets
      const { data: ticketSales, error: ticketError } = await supabase
        .from('ticket_items')
        .select(`
          id,
          quantity,
          unit_price,
          ticket:tickets(
            reference,
            client_nom,
            created_at
          )
        `)
        .eq('article_id', articleId)
        .eq('tickets.statut', 'payé');

      if (ticketError) throw ticketError;

      // Load sales from invoices
      const { data: invoiceSales, error: invoiceError } = await supabase
        .from('invoice_items')
        .select(`
          id,
          quantity,
          unit_price,
          invoice:invoices(
            reference,
            client_nom,
            created_at
          )
        `)
        .eq('article_id', articleId)
        .eq('invoices.status', 'payé');

      if (invoiceError) throw invoiceError;

      // Combine and format sales data
      const sales = [
        ...(ticketSales || []).map((sale: any) => ({
          id: sale.id,
          date: sale.ticket.created_at,
          document_type: 'ticket' as const,
          document_reference: sale.ticket.reference,
          client_nom: sale.ticket.client_nom,
          quantity: sale.quantity,
          unit_price: sale.unit_price,
          total: sale.quantity * sale.unit_price
        })),
        ...(invoiceSales || []).map((sale: any) => ({
          id: sale.id,
          date: sale.invoice.created_at,
          document_type: 'invoice' as const,
          document_reference: sale.invoice.reference,
          client_nom: sale.invoice.client_nom,
          quantity: sale.quantity,
          unit_price: sale.unit_price,
          total: sale.quantity * sale.unit_price
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setSaleHistory(sales);

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
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold">{article.nom}</h2>
                <p className="text-sm text-gray-500">Code: {article.cb}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>

          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`btn ${activeTab === 'info' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Package className="h-4 w-4 mr-2" />
              Informations
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`btn ${activeTab === 'purchases' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Historique Achats
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`btn ${activeTab === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Historique Ventes
            </button>
          </div>

          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-4">
                  <h3 className="text-lg font-medium mb-4">Informations Générales</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Code Barre</dt>
                      <dd className="font-medium">{article.cb}</dd>
                    </div>
                    {article.cb_ref && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Code Référence</dt>
                        <dd className="font-medium">{article.cb_ref}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Catégorie</dt>
                      <dd className="font-medium">{article.category?.name || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Marque</dt>
                      <dd className="font-medium">{article.brand?.name || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Type Stock</dt>
                      <dd className="font-medium">
                        {article.type_stock === 'O' ? 'Original' : 
                         article.type_stock === 'N' ? 'Non Original' : 'Service'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Emplacement</dt>
                      <dd className="font-medium">{article.emplacement || '-'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="card p-4">
                  <h3 className="text-lg font-medium mb-4">Prix et Stock</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Prix d'Achat</dt>
                      <dd className="font-medium">{formatCurrency(article.prixa)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Frais Transport</dt>
                      <dd className="font-medium">{formatCurrency(article.transport_cost || 0)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Prix de Revient</dt>
                      <dd className="font-medium">{formatCurrency(article.total_cost || article.prixa)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Prix de Gros</dt>
                      <dd className="font-medium">{formatCurrency(article.prixg)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Prix de Vente</dt>
                      <dd className="font-medium">{formatCurrency(article.prixd)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Dernier Prix Vente</dt>
                      <dd className="font-medium">
                        {article.last_sale_price > 0 ? (
                          <span className={article.last_sale_price > article.prixd ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(article.last_sale_price)}
                          </span>
                        ) : '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Stock Actuel</dt>
                      <dd className="font-medium">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          article.stock > 10 
                            ? 'bg-green-100 text-green-800'
                            : article.stock > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {article.stock}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {article.obs && (
                <div className="card p-4">
                  <h3 className="text-lg font-medium mb-4">Observations</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{article.obs}</p>
                </div>
              )}

              {article.references?.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-lg font-medium mb-4">Références Additionnelles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {article.references.map((ref: any) => (
                      <div key={ref.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{ref.code}</span>
                        {ref.description && (
                          <span className="text-sm text-gray-500">{ref.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <div className="card">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          N° Commande
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fournisseur
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantité
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix Unitaire
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transport
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchaseHistory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                            Aucun historique d'achat disponible
                          </td>
                        </tr>
                      ) : (
                        purchaseHistory.map((purchase) => (
                          <tr key={purchase.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(purchase.purchase_date)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {purchase.order_reference}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {purchase.supplier_name}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                              {purchase.quantity}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                              {formatCurrency(purchase.unit_price)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                              {formatCurrency(purchase.transport_cost)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                              {formatCurrency(purchase.total_cost)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                purchase.status === 'received' ? 'bg-green-100 text-green-800' :
                                purchase.status === 'validated' ? 'bg-yellow-100 text-yellow-800' :
                                purchase.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {purchase.status === 'received' ? 'Reçue' :
                                 purchase.status === 'validated' ? 'Validée' :
                                 purchase.status === 'cancelled' ? 'Annulée' :
                                 'Brouillon'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="card">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Document
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantité
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix Unitaire
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {saleHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            Aucun historique de vente disponible
                          </td>
                        </tr>
                      ) : (
                        saleHistory.map((sale) => (
                          <tr key={sale.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(sale.date)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                sale.document_type === 'ticket' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {sale.document_reference}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {sale.client_nom}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                              {sale.quantity}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                              {formatCurrency(sale.unit_price)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                              {formatCurrency(sale.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleHistory;