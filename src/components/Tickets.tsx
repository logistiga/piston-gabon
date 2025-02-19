import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertCircle, FileText, ChevronLeft, ChevronRight, Printer, Mail, Download, CheckCircle, XCircle, Trash2, Edit, ArrowRight, CreditCard } from 'lucide-react';
import { supabase } from '../config/supabase';
import TicketForm from './tickets/TicketForm';
import PrintButton from './tickets/PrintButton';
import PaymentForm from './payments/PaymentForm';
import { formatCurrency } from '../utils/formatters';

interface Ticket {
  id: string;
  reference: string;
  client_nom: string;
  client_email: string;
  client_telephone: string;
  montant: number;
  statut: 'en_attente' | 'payé' | 'annulé' | 'avance';
  facture: boolean;
  created_at: string;
  notes?: string;
}

interface TicketPayment {
  ticket_id: string;
  reference: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
  created_at: string;
  client_nom: string;
  client_email: string;
  client_telephone: string;
  statut: string;
  facture: boolean;
  notes?: string;
}

const ITEMS_PER_PAGE = 10;

const Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<TicketPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    dateStart: '',
    dateEnd: '',
  });

  useEffect(() => {
    loadTickets();
  }, [currentPage, filters, searchTerm]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('ticket_payments_view')
        .select('*', { count: 'exact' });

      // Apply filters
      if (searchTerm) {
        query = query.ilike('reference', `%${searchTerm}%`);
      }

      if (filters.status) {
        query = query.eq('payment_status', filters.status);
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

      setTickets(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowEditForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTickets();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEmailTicket = async (ticket: Ticket) => {
    if (!ticket.client_email) {
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

  const handleTransfer = async (ticket: Ticket) => {
    try {
      setLoading(true);
      setError(null);

      // Get ticket items
      const { data: items, error: itemsError } = await supabase
        .from('ticket_items')
        .select('*')
        .eq('ticket_id', ticket.id);

      if (itemsError) throw itemsError;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          client_nom: ticket.client_nom,
          client_email: ticket.client_email,
          client_telephone: ticket.client_telephone,
          total: ticket.montant,
          status: ticket.statut === 'payé' ? 'payé' : 'non_payé',
          payment_date: ticket.statut === 'payé' ? new Date().toISOString() : null,
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
            article_id: item.article_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount,
            discount_type: item.discount_type
          }))
        );

      if (invoiceItemsError) throw invoiceItemsError;

      // Update ticket status
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ facture: true })
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      loadTickets();

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: Ticket['statut']) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ statut: status })
        .eq('id', id);

      if (error) throw error;
      loadTickets();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePaymentClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Tickets</h1>
          <p className="text-sm text-gray-500">
            {totalCount} ticket{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedTicket(null);
            setShowCreateForm(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau Ticket
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
                <option value="en_attente">En attente</option>
                <option value="avance">Avance</option>
                <option value="payé">Payé</option>
                <option value="annulé">Annulé</option>
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
        {tickets.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Aucun ticket trouvé
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.ticket_id}
              className="p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    {ticket.reference}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ticket.payment_status === 'payé' ? 'bg-green-100 text-green-800' :
                      ticket.payment_status === 'avance' ? 'bg-orange-100 text-orange-800' :
                      ticket.payment_status === 'annulé' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {ticket.payment_status === 'payé' ? 'Payé' :
                     ticket.payment_status === 'avance' ? 'Avance' :
                     ticket.payment_status === 'annulé' ? 'Annulé' :
                     'En attente'}
                  </span>
                  {ticket.remaining_amount > 0 && (
                    <span className="text-sm text-gray-500">
                      (Reste: {formatCurrency(ticket.remaining_amount)})
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(ticket.total_amount)}
                  </span>
                  {ticket.paid_amount > 0 && (
                    <span className="text-green-600">
                      Payé: {formatCurrency(ticket.paid_amount)}
                    </span>
                  )}
                  <span className="text-gray-500">
                    {formatDate(ticket.created_at)}
                  </span>
                  {ticket.client_nom && (
                    <span className="text-gray-500">
                      Client: {ticket.client_nom}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Only show payment button if ticket is not fully paid */}
                {ticket.payment_status !== 'payé' && ticket.payment_status !== 'annulé' && (
                  <button
                    onClick={() => handlePaymentClick({
                      id: ticket.ticket_id,
                      reference: ticket.reference,
                      client_nom: ticket.client_nom,
                      client_email: ticket.client_email,
                      client_telephone: ticket.client_telephone,
                      montant: ticket.total_amount,
                      statut: ticket.statut as Ticket['statut'],
                      facture: ticket.facture,
                      created_at: ticket.created_at,
                      notes: ticket.notes
                    })}
                    className="btn btn-secondary p-2"
                    title="Encaisser"
                  >
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </button>
                )}

                {/* N'afficher les boutons de modification et annulation que pour les tickets en attente */}
                {ticket.payment_status === 'en_attente' && (
                  <>
                    <button
                      onClick={() => handleEdit({
                        id: ticket.ticket_id,
                        reference: ticket.reference,
                        client_nom: ticket.client_nom,
                        client_email: ticket.client_email,
                        client_telephone: ticket.client_telephone,
                        montant: ticket.total_amount,
                        statut: ticket.statut as Ticket['statut'],
                        facture: ticket.facture,
                        created_at: ticket.created_at,
                        notes: ticket.notes
                      })}
                      className="btn btn-secondary p-2"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4 text-yellow-600" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(ticket.ticket_id, 'annulé')}
                      className="btn btn-secondary p-2"
                      title="Annuler"
                    >
                      <XCircle className="h-4 w-4 text-red-600" />
                    </button>
                  </>
                )}

                {/* Toujours afficher les boutons d'impression */}
                <PrintButton
                  ticketId={ticket.ticket_id}
                  format="detailed"
                  onError={(err) => setError(err.message)}
                  className="btn btn-secondary p-2"
                  title="Format A4"
                >
                  <Printer className="h-4 w-4" />
                  A4
                </PrintButton>

                <button
                  onClick={() => handleEmailTicket({
                    id: ticket.ticket_id,
                    reference: ticket.reference,
                    client_nom: ticket.client_nom,
                    client_email: ticket.client_email,
                    client_telephone: ticket.client_telephone,
                    montant: ticket.total_amount,
                    statut: ticket.statut as Ticket['statut'],
                    facture: ticket.facture,
                    created_at: ticket.created_at,
                    notes: ticket.notes
                  })}
                  className="btn btn-secondary p-2"
                  title="Envoyer par email"
                  disabled={!ticket.client_email}
                >
                  <Mail className="h-4 w-4 text-gray-600" />
                </button>

                <PrintButton
                  ticketId={ticket.ticket_id}
                  format="pos"
                  onError={(err) => setError(err.message)}
                  className="btn btn-secondary p-2"
                  title="Format Ticket"
                >
                  <Printer className="h-4 w-4" />
                  POS
                </PrintButton>

                {/* N'afficher le bouton de transfert que pour les tickets payés non facturés */}
                {!ticket.facture && ticket.payment_status === 'payé' && (
                  <button
                    onClick={() => handleTransfer({
                      id: ticket.ticket_id,
                      reference: ticket.reference,
                      client_nom: ticket.client_nom,
                      client_email: ticket.client_email,
                      client_telephone: ticket.client_telephone,
                      montant: ticket.total_amount,
                      statut: ticket.statut as Ticket['statut'],
                      facture: ticket.facture,
                      created_at: ticket.created_at,
                      notes: ticket.notes
                    })}
                    className="btn btn-secondary p-2"
                    title="Transférer en facture"
                  >
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </button>
                )}

                {/* N'afficher le bouton de suppression que pour les tickets en attente */}
                {ticket.payment_status === 'en_attente' && (
                  <button
                    onClick={() => handleDelete(ticket.ticket_id)}
                    className="btn btn-secondary p-2"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                )}
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

      {(showCreateForm || showEditForm) && (
        <TicketForm
          ticketId={selectedTicket?.id}
          onClose={() => {
            setShowCreateForm(false);
            setShowEditForm(false);
            setSelectedTicket(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setShowEditForm(false);
            setSelectedTicket(null);
            loadTickets();
          }}
        />
      )}

      {showPaymentForm && selectedTicket && (
        <PaymentForm
          entityType="ticket"
          entityId={selectedTicket.id}
          totalAmount={selectedTicket.montant}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedTicket(null);
          }}
          onSuccess={() => {
            setShowPaymentForm(false);
            setSelectedTicket(null);
            loadTickets();
          }}
        />
      )}
    </div>
  );
};

export default Tickets;