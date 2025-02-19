import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  FileText, Users, CreditCard, Download, Printer,
  Calendar, Filter, Search, AlertCircle, ArrowUpRight,
  ArrowDownRight, CreditCard as PaymentIcon
} from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';
import PaymentForm from '../payments/PaymentForm';
import * as XLSX from 'xlsx';

interface Report {
  id: string;
  reference: string;
  client_nom: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  due_date?: string;
  paid_amount?: number;
  montant?: number;
  statut?: string;
}

interface ClientBalance {
  id: string;
  nom: string;
  entreprise: string | null;
  email: string;
  telephone: string;
  limite_credit: number;
  total_sales: number;
  balance: number;
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('invoices');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const [invoices, setInvoices] = useState<Report[]>([]);
  const [tickets, setTickets] = useState<Report[]>([]);
  const [clientBalances, setClientBalances] = useState<ClientBalance[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    dateStart: '',
    dateEnd: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filters, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      switch (activeTab) {
        case 'invoices':
          await loadInvoices();
          break;
        case 'tickets':
          await loadTickets();
          break;
        case 'clients':
          await loadClientBalances();
          break;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.dateStart) {
      query = query.gte('created_at', filters.dateStart);
    }
    if (filters.dateEnd) {
      query = query.lte('created_at', filters.dateEnd);
    }

    const { data, error } = await query;
    if (error) throw error;
    setInvoices(data || []);
  };

  const loadTickets = async () => {
    let query = supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('statut', filters.status);
    }
    if (filters.dateStart) {
      query = query.gte('created_at', filters.dateStart);
    }
    if (filters.dateEnd) {
      query = query.lte('created_at', filters.dateEnd);
    }

    const { data, error } = await query;
    if (error) throw error;
    setTickets(data || []);
  };

  const loadClientBalances = async () => {
    try {
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, nom, entreprise, email, telephone, limite_credit');

      if (clientsError) throw clientsError;

      const balances = await Promise.all((clients || []).map(async (client) => {
        const [ticketsResponse, invoicesResponse] = await Promise.all([
          supabase
            .from('tickets')
            .select('montant')
            .eq('client_nom', client.nom)
            .eq('statut', 'payé'),
          supabase
            .from('invoices')
            .select('total')
            .eq('client_nom', client.nom)
            .eq('status', 'payé')
        ]);

        const totalTickets = (ticketsResponse.data || [])
          .reduce((sum, t) => sum + (t.montant || 0), 0);

        const totalInvoices = (invoicesResponse.data || [])
          .reduce((sum, i) => sum + (i.total || 0), 0);

        const totalSales = totalTickets + totalInvoices;

        return {
          ...client,
          total_sales: totalSales,
          balance: client.limite_credit - totalSales
        };
      }));

      setClientBalances(balances);
    } catch (err) {
      console.error('Error loading client balances:', err);
      throw err;
    }
  };

  const handlePayment = (item: any) => {
    setSelectedItem(item);
    setShowPaymentForm(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleExport = () => {
    try {
      let data: any[] = [];
      let filename = '';

      switch (activeTab) {
        case 'invoices':
          data = invoices.map(invoice => ({
            'Référence': invoice.reference,
            'Client': invoice.client_nom,
            'Montant': invoice.total,
            'Statut': invoice.status === 'payé' ? 'Payé' : 'Non payé',
            'Date': formatDate(invoice.created_at)
          }));
          filename = `factures_${selectedDate}.xlsx`;
          break;

        case 'tickets':
          data = tickets.map(ticket => ({
            'Référence': ticket.reference,
            'Client': ticket.client_nom,
            'Montant': ticket.montant || 0,
            'Statut': ticket.statut === 'payé' ? 'Payé' : 
                     ticket.statut === 'en_attente' ? 'En attente' : 'Annulé',
            'Date': formatDate(ticket.created_at)
          }));
          filename = `tickets_${selectedDate}.xlsx`;
          break;

        case 'clients':
          data = clientBalances.map(client => ({
            'Client': client.entreprise || client.nom,
            'Nom Contact': client.nom,
            'Email': client.email,
            'Téléphone': client.telephone,
            'Limite Crédit': client.limite_credit,
            'Total Ventes': client.total_sales,
            'Balance': client.balance
          }));
          filename = `clients_${selectedDate}.xlsx`;
          break;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      setError('Erreur lors de l\'export Excel');
    }
  };

  const handlePrint = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }

      let title = '';
      let content = '';

      switch (activeTab) {
        case 'invoices':
          title = 'Rapport des Factures';
          content = `
            <h2>Résumé</h2>
            <p>Total Factures: ${formatCurrency(invoices.reduce((sum, inv) => sum + inv.total, 0))}</p>
            <p>Factures Payées: ${formatCurrency(invoices.filter(inv => inv.status === 'payé').reduce((sum, inv) => sum + inv.total, 0))}</p>
            <p>Factures Non Payées: ${formatCurrency(invoices.filter(inv => inv.status !== 'payé').reduce((sum, inv) => sum + inv.total, 0))}</p>
            
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.map(invoice => `
                  <tr>
                    <td>${invoice.reference}</td>
                    <td>${invoice.client_nom}</td>
                    <td>${formatCurrency(invoice.total)}</td>
                    <td>${invoice.status === 'payé' ? 'Payé' : 'Non payé'}</td>
                    <td>${formatDate(invoice.created_at)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
          break;

        case 'tickets':
          title = 'Rapport des Tickets';
          content = `
            <h2>Résumé</h2>
            <p>Total Tickets: ${formatCurrency(tickets.reduce((sum, t) => sum + (t.montant || 0), 0))}</p>
            <p>Tickets Payés: ${formatCurrency(tickets.filter(t => t.statut === 'payé').reduce((sum, t) => sum + (t.montant || 0), 0))}</p>
            <p>Tickets En Attente: ${formatCurrency(tickets.filter(t => t.statut === 'en_attente').reduce((sum, t) => sum + (t.montant || 0), 0))}</p>
            
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${tickets.map(ticket => `
                  <tr>
                    <td>${ticket.reference}</td>
                    <td>${ticket.client_nom}</td>
                    <td>${formatCurrency(ticket.montant || 0)}</td>
                    <td>${ticket.statut === 'payé' ? 'Payé' : 
                         ticket.statut === 'en_attente' ? 'En attente' : 'Annulé'}</td>
                    <td>${formatDate(ticket.created_at)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
          break;

        case 'clients':
          title = 'Rapport des Clients';
          content = `
            <h2>Résumé</h2>
            <p>Total Ventes: ${formatCurrency(clientBalances.reduce((sum, client) => sum + client.total_sales, 0))}</p>
            <p>Limite Crédit Total: ${formatCurrency(clientBalances.reduce((sum, client) => sum + client.limite_credit, 0))}</p>
            <p>Balance Totale: ${formatCurrency(clientBalances.reduce((sum, client) => sum + client.balance, 0))}</p>
            
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Limite Crédit</th>
                  <th>Total Ventes</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                ${clientBalances.map(client => `
                  <tr>
                    <td>${client.entreprise || client.nom}</td>
                    <td>${formatCurrency(client.limite_credit)}</td>
                    <td>${formatCurrency(client.total_sales)}</td>
                    <td>${formatCurrency(client.balance)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
          break;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4; margin: 2cm; }
            body { 
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            h1 { 
              text-align: center;
              color: #333;
              margin-bottom: 30px;
            }
            h2 {
              color: #666;
              margin-top: 30px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f3f4f6;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Date du rapport: ${new Date().toLocaleDateString('fr-FR')}</p>
          ${content}
          <div class="footer">
            <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();

    } catch (err) {
      console.error('Error printing report:', err);
      setError('Erreur lors de l\'impression');
    }
  };

  const renderInvoicesReport = () => {
    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Factures</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total, 0))}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Factures Payées</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(invoices.filter(inv => inv.status === 'payé').reduce((sum, inv) => sum + inv.total, 0))}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Factures Non Payées</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(invoices.filter(inv => inv.status !== 'payé').reduce((sum, inv) => sum + inv.total, 0))}
                </p>
              </div>
              <ArrowDownRight className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="card divide-y divide-gray-200">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    {invoice.reference}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    invoice.status === 'payé' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status === 'payé' ? 'Payé' : 'Non payé'}
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
                    Client: {invoice.client_nom}
                  </span>
                </div>
              </div>

              {invoice.status !== 'payé' && (
                <button
                  onClick={() => handlePayment(invoice)}
                  className="btn btn-primary"
                >
                  <PaymentIcon className="h-4 w-4 mr-2" />
                  Payer
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTicketsReport = () => {
    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(tickets.reduce((sum, t) => sum + (t.montant || 0), 0))}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tickets Payés</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(tickets.filter(t => t.statut === 'payé').reduce((sum, t) => sum + (t.montant || 0), 0))}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tickets En Attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(tickets.filter(t => t.statut === 'en_attente').reduce((sum, t) => sum + (t.montant || 0), 0))}
                </p>
              </div>
              <ArrowDownRight className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="card divide-y divide-gray-200">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    {ticket.reference}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    ticket.statut === 'payé' ? 'bg-green-100 text-green-800' :
                    ticket.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {ticket.statut === 'payé' ? 'Payé' :
                     ticket.statut === 'en_attente' ? 'En attente' : 'Annulé'}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(ticket.montant || 0)}
                  </span>
                  <span className="text-gray-500">
                    {formatDate(ticket.created_at)}
                  </span>
                  <span className="text-gray-500">
                    Client: {ticket.client_nom}
                  </span>
                </div>
              </div>

              {ticket.statut === 'en_attente' && (
                <button
                  onClick={() => handlePayment(ticket)}
                  className="btn btn-primary"
                >
                  <PaymentIcon className="h-4 w-4 mr-2" />
                  Payer
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderClientBalances = () => {
    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Ventes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(clientBalances.reduce((sum, client) => sum + client.total_sales, 0))}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Limite Crédit Total</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(clientBalances.reduce((sum, client) => sum + client.limite_credit, 0))}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Balance Totale</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(clientBalances.reduce((sum, client) => sum + client.balance, 0))}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="card divide-y divide-gray-200">
          {clientBalances.map((client) => (
            <div key={client.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {client.entreprise || client.nom}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="text-gray-500">
                    Limite: {formatCurrency(client.limite_credit)}
                  </span>
                  <span className="text-gray-500">
                    Ventes: {formatCurrency(client.total_sales)}
                  </span>
                  <span className={`font-medium ${
                    client.balance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Balance: {formatCurrency(client.balance)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white rounded-md border p-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              className="border-none focus:ring-0"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button
            onClick={handleExport}
            className="btn btn-secondary"
          >
            <Download className="h-5 w-5 mr-2" />
            Excel
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-secondary"
          >
            <Printer className="h-5 w-5 mr-2" />
            Imprimer
          </button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Factures
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clients
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher..."
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
                  <option value="payé">Payé</option>
                  <option value="non_payé">Non payé</option>
                  <option value="en_attente">En attente</option>
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
            </div> </div>
        )}

        <TabsContent value="invoices">
          {renderInvoicesReport()}
        </TabsContent>

        <TabsContent value="tickets">
          {renderTicketsReport()}
        </TabsContent>

        <TabsContent value="clients">
          {renderClientBalances()}
        </TabsContent>
      </Tabs>

      {showPaymentForm && selectedItem && (
        <PaymentForm
          entityType={activeTab === 'invoices' ? 'invoice' : 'ticket'}
          entityId={selectedItem.id}
          totalAmount={selectedItem.total || selectedItem.montant || 0}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedItem(null);
          }}
          onSuccess={() => {
            setShowPaymentForm(false);
            setSelectedItem(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default Reports;