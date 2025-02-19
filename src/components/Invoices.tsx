import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertCircle, FileText, ChevronLeft, ChevronRight, Printer, Mail, Download, CheckCircle, XCircle, Trash2, Edit, CreditCard } from 'lucide-react';
import { supabase } from '../config/supabase';
import InvoiceForm from './invoices/InvoiceForm';
import PrintButton from './tickets/PrintButton';
import PaymentForm from './payments/PaymentForm';
import { formatCurrency } from '../utils/formatters';

interface Invoice {
  id: string;
  reference: string;
  client_nom: string;
  client_email: string;
  client_telephone: string;
  total: number;
  status: 'payé' | 'non_payé' | 'avance';
  payment_date: string | null;
  due_date: string;
  created_at: string;
  notes?: string;
}

const ITEMS_PER_PAGE = 10;

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    dateStart: '',
    dateEnd: '',
  });

  useEffect(() => {
    loadInvoices();
  }, [currentPage, filters, searchTerm]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('invoices')
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

      setInvoices(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    setSelectedInvoice(invoices.find(i => i.id === id) || null);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadInvoices();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEmailInvoice = async (invoice: Invoice) => {
    if (!invoice.client_email) {
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

  const handlePrint = async (invoice: Invoice) => {
    try {
      // Get invoice details
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (
            id,
            quantity,
            unit_price,
            discount,
            article:articles!inner(*)
          )
        `)
        .eq('id', invoice.id)
        .single();

      if (invoiceError) throw invoiceError;

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
      const subTotal = invoiceData.invoice_items.reduce((sum: number, item: any) => {
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
          <title>Facture #${invoiceData.reference}</title>
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
            .invoice-info {
              margin-bottom: 40px;
            }
            .invoice-info div {
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
          </div>

          <div class="invoice-info">
            <div>Facture N°: ${invoiceData.reference}</div>
            <div>Date: ${new Date(invoiceData.created_at).toLocaleDateString('fr-FR')}</div>
            <div>Client: ${invoiceData.client_nom || 'Client Comptant'}</div>
            ${invoiceData.client_telephone ? `<div>Tel: ${invoiceData.client_telephone}</div>` : ''}
            <div>Échéance: ${new Date(invoiceData.due_date).toLocaleDateString('fr-FR')}</div>
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
              ${invoiceData.invoice_items.map((item: any) => {
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
              Total TTC: ${invoiceData.total.toLocaleString('fr-FR')} XAF
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

  const handlePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentForm(true);
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Factures</h1>
          <p className="text-sm text-gray-500">
            {totalCount} facture{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedInvoice(null);
            setShowCreateForm(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvelle Facture
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
                <option value="non_payé">Non payé</option>
                <option value="avance">Avance</option>
                <option value="payé">Payé</option>
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
        {invoices.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Aucune facture trouvée
          </div>
        ) : (
          invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    {invoice.reference}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      invoice.status === 'payé' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'avance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    {invoice.status === 'payé' ? 'Payé' : 
                     invoice.status === 'avance' ? 'Avance' : 
                     'Non payé'}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(invoice.total)}
                  </span>
                  <span className="text-gray-500">
                    {formatDate(invoice.created_at)}
                  </span>
                  <span className="text-gray-500">
                    Échéance: {formatDate(invoice.due_date)}
                  </span>
                  {invoice.client_nom && (
                    <span className="text-gray-500">
                      Client: {invoice.client_nom}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {invoice.status !== 'payé' && (
                  <button
                    onClick={() => handlePayment(invoice)}
                    className="btn btn-primary"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payer
                  </button>
                )}

                <button
                  onClick={() => handlePrint(invoice)}
                  className="btn btn-secondary"
                  title="Imprimer A4"
                >
                  <Printer className="h-4 w-4" />
                  A4
                </button>

                <button
                  onClick={() => handleEmailInvoice(invoice)}
                  className="btn btn-secondary"
                  title="Envoyer par email"
                  disabled={!invoice.client_email}
                >
                  <Mail className="h-4 w-4 text-gray-600" />
                </button>

                <button
                  onClick={() => handleDelete(invoice.id)}
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
        <InvoiceForm
          invoiceId={selectedInvoice?.id}
          onClose={() => {
            setShowCreateForm(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setSelectedInvoice(null);
            loadInvoices();
          }}
        />
      )}

      {showPaymentForm && selectedInvoice && (
        <PaymentForm
          entityType="invoice"
          entityId={selectedInvoice.id}
          totalAmount={selectedInvoice.total}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            setShowPaymentForm(false);
            setSelectedInvoice(null);
            loadInvoices();
          }}
        />
      )}
    </div>
  );
};

export default Invoices;