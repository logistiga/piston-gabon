import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertCircle, FileText, ChevronLeft, ChevronRight, Printer, Mail, Download, CheckCircle, XCircle, Trash2, Edit, ArrowRight } from 'lucide-react';
import { supabase } from '../config/supabase';
import QuoteForm from './quotes/QuoteForm';

interface Quote {
  id: string;
  reference: string;
  client_nom: string;
  client_email: string;
  client_telephone: string;
  total: number;
  status: 'draft' | 'sent' | 'confirmed' | 'rejected';
  invoice_status: 'not_invoiced' | 'invoiced';
  valid_until: string;
  notes: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    dateStart: '',
    dateEnd: '',
  });

  useEffect(() => {
    loadQuotes();
  }, [currentPage, filters, searchTerm]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('quotes')
        .select('*', { count: 'exact' });

      // Apply filters
      if (searchTerm) {
        query = query.ilike('reference', `%${searchTerm}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
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

      setQuotes(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    setSelectedQuote(id);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadQuotes();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEmailQuote = async (quote: Quote) => {
    if (!quote.client_email) {
      setError('Aucune adresse email disponible pour ce client');
      return;
    }

    try {
      // Add email sending logic here
      alert('Fonctionnalité en cours de développement');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePrint = async (quote: Quote) => {
    try {
      // Get quote details
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (
            id,
            quantity,
            unit_price,
            discount,
            article:articles!inner(*)
          )
        `)
        .eq('id', quote.id)
        .single();

      if (quoteError) throw quoteError;

      // Get company settings
      const { data: company, error: companyError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (companyError) throw companyError;

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Impossible d\'ouvrir la fenêtre d\'impression');
      }

      // Calculate totals
      const subTotal = quoteData.quote_items.reduce((sum: number, item: any) => {
        const itemTotal = item.unit_price * item.quantity;
        const discount = (itemTotal * (item.discount || 0)) / 100;
        return sum + (itemTotal - discount);
      }, 0);

      // Generate HTML content
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Devis #${quoteData.reference}</title>
          <style>
            @page { size: A4; margin: 2cm; }
            body { 
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #000;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .company-info {
              font-size: 14px;
              margin-bottom: 5px;
            }
            .quote-info {
              margin-bottom: 40px;
            }
            .quote-info div {
              margin-bottom: 10px;
            }
            .items {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .items th, .items td {
              border: 1px solid #000;
              padding: 10px;
            }
            .items th {
              background-color: #f3f4f6;
            }
            .totals {
              text-align: right;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #000;
            }
            .totals div {
              margin-bottom: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 12px;
              padding-top: 20px;
              border-top: 2px solid #000;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${company.name}</div>
            <div class="company-info">${company.address}</div>
            <div class="company-info">Tel: ${company.phone}</div>
            <div class="company-info">RC: ${company.rc_number} - NIF: ${company.nif_number}</div>
          </div>

          <div class="quote-info">
            <div>Devis N°: ${quoteData.reference}</div>
            <div>Date: ${new Date(quoteData.created_at).toLocaleDateString('fr-FR')}</div>
            <div>Client: ${quoteData.client_nom || 'Client Comptant'}</div>
            ${quoteData.client_telephone ? `<div>Tel: ${quoteData.client_telephone}</div>` : ''}
            <div>Valide jusqu'au: ${new Date(quoteData.valid_until).toLocaleDateString('fr-FR')}</div>
          </div>

          <table class="items">
            <thead>
              <tr>
                <th>Désignation</th>
                <th style="text-align: right">Qté</th>
                <th style="text-align: right">P.U HT</th>
                <th style="text-align: right">Remise</th>
                <th style="text-align: right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              ${quoteData.quote_items.map((item: any) => {
                const total = item.quantity * item.unit_price;
                const discount = (total * (item.discount || 0)) / 100;
                const finalTotal = total - discount;
                return `
                  <tr>
                    <td>${item.article.nom}</td>
                    <td style="text-align: right">${item.quantity}</td>
                    <td style="text-align: right">${item.unit_price.toLocaleString('fr-FR')}</td>
                    <td style="text-align: right">${item.discount}%</td>
                    <td style="text-align: right">${finalTotal.toLocaleString('fr-FR')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div>Total HT: ${subTotal.toLocaleString('fr-FR')} XAF</div>
            <div>TVA (18%): ${(subTotal * 0.18).toLocaleString('fr-FR')} XAF</div>
            <div style="font-weight: bold; font-size: 18px;">
              Total TTC: ${quoteData.total.toLocaleString('fr-FR')} XAF
            </div>
          </div>

          <div class="footer">
            <div>${company.return_policy}</div>
            <div>Merci de votre confiance</div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => {
                window.close();
                window.opener.postMessage('printComplete', '*');
              }, 500);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(content);
      printWindow.document.close();

    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleTransferToInvoice = async (quote: Quote) => {
    try {
      setLoading(true);
      setError(null);

      // Get quote items
      const { data: items, error: itemsError } = await supabase
        .from('quote_items')
        .select('id, quantity, unit_price, discount, article:articles(*)')
        .eq('quote_id', quote.id);

      if (itemsError) throw itemsError;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          client_nom: quote.client_nom,
          client_email: quote.client_email,
          client_telephone: quote.client_telephone,
          total: quote.total,
          notes: quote.notes,
          status: 'non_payé',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const { error: invoiceItemsError } = await supabase
        .from('invoice_items')
        .insert(
          items.map(item => ({
            invoice_id: invoice.id,
            article_id: item.article.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount
          }))
        );

      if (invoiceItemsError) throw invoiceItemsError;

      // Update quote status
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'confirmed',
          invoice_status: 'invoiced'
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      loadQuotes();

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToTicket = async (quote: Quote) => {
    try {
      setLoading(true);
      setError(null);

      // Get quote items
      const { data: items, error: itemsError } = await supabase
        .from('quote_items')
        .select('id, quantity, unit_price, discount, article:articles(*)')
        .eq('quote_id', quote.id);

      if (itemsError) throw itemsError;

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert([{
          client_nom: quote.client_nom,
          client_email: quote.client_email,
          client_telephone: quote.client_telephone,
          montant: quote.total,
          notes: quote.notes,
          statut: 'en_attente'
        }])
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create ticket items
      const { error: ticketItemsError } = await supabase
        .from('ticket_items')
        .insert(
          items.map(item => ({
            ticket_id: ticket.id,
            article_id: item.article.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount
          }))
        );

      if (ticketItemsError) throw ticketItemsError;

      // Update quote status
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ status: 'confirmed' })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      loadQuotes();

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Quote['status']) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmé';
      case 'rejected':
        return 'Rejeté';
      case 'sent':
        return 'Envoyé';
      default:
        return 'Brouillon';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Devis</h1>
          <p className="text-sm text-gray-500">
            {totalCount} devis{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedQuote(null);
            setShowCreateForm(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau Devis
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher par référence..."
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
                Statut
              </label>
              <select
                className="input"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Tous</option>
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyé</option>
                <option value="confirmed">Confirmé</option>
                <option value="rejected">Rejeté</option>
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

      <div className="card divide-y divide-gray-200">
        {quotes.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Aucun devis trouvé
          </div>
        ) : (
          quotes.map((quote) => (
            <div
              key={quote.id}
              className="p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    {quote.reference}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      quote.status
                    )}`}
                  >
                    {getStatusLabel(quote.status)}
                  </span>
                  {quote.invoice_status === 'invoiced' && (
                    <span className="inline-flex items-center text-green-600">
                      <FileText className="h-4 w-4 mr-1" />
                      Facturé
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(quote.total)}
                  </span>
                  <span className="text-gray-500">
                    {formatDate(quote.created_at)}
                  </span>
                  <span className="text-gray-500">
                    Valide jusqu'au {formatDate(quote.valid_until)}
                  </span>
                  {quote.client_nom && (
                    <span className="text-gray-500">
                      Client: {quote.client_nom}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(quote.id)}
                  className="btn btn-secondary"
                  title="Modifier"
                >
                  <Edit className="h-4 w-4 text-yellow-600" />
                </button>

                <button
                  onClick={() => handlePrint(quote)}
                  className="btn btn-secondary"
                  title="Imprimer A4"
                >
                  <Printer className="h-4 w-4" />
                  A4
                </button>

                <button
                  onClick={() => handleEmailQuote(quote)}
                  className="btn btn-secondary"
                  title="Envoyer par email"
                  disabled={!quote.client_email}
                >
                  <Mail className="h-4 w-4 text-gray-600" />
                </button>

                {quote.status !== 'confirmed' && quote.invoice_status !== 'invoiced' && (
                  <>
                    <button
                      onClick={() => handleTransferToTicket(quote)}
                      className="btn btn-secondary"
                      title="Transférer en ticket"
                    >
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                      Ticket
                    </button>

                    <button
                      onClick={() => handleTransferToInvoice(quote)}
                      className="btn btn-secondary"
                      title="Transférer en facture"
                    >
                      <ArrowRight className="h-4 w-4 text-green-600" />
                      Facture
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleDelete(quote.id)}
                  className="btn btn-secondary"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {totalCount > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.ceil(totalCount / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`btn ${
                    currentPage === page
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'btn-secondary'
                  }`}
                >
                  {page}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), currentPage + 1))}
            disabled={currentPage === Math.ceil(totalCount / ITEMS_PER_PAGE)}
            className="btn btn-secondary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {showCreateForm && (
        <QuoteForm
          quoteId={selectedQuote}
          onClose={() => {
            setShowCreateForm(false);
            setSelectedQuote(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setSelectedQuote(null);
            loadQuotes();
          }}
        />
      )}
    </div>
  );
};

export default Quotes;