import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, AlertCircle, Building2, Mail, Phone, CreditCard, Edit, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';
import ClientForm from './ClientForm';
import ClientRegisterForm from './ClientRegisterForm';
import { debounce } from 'lodash';

interface Client {
  id: string;
  client_id: string;
  nom: string;
  entreprise?: string;
  email?: string;
  telephone?: string;
  limite_credit: number;
  nif?: string;
  adresse?: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

const ClientList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [filters, setFilters] = useState({
    type: 'all',
    minCredit: '',
    maxCredit: '',
  });

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      loadClients(term);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, filters, currentPage]);

  const loadClients = async (term?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (term) {
        query = query.or(`nom.ilike.%${term}%,email.ilike.%${term}%,telephone.ilike.%${term}%,client_id.ilike.%${term}%`);
      }

      // Apply filters
      if (filters.type === 'company') {
        query = query.not('entreprise', 'is', null);
      } else if (filters.type === 'individual') {
        query = query.is('entreprise', null);
      }

      if (filters.minCredit) {
        query = query.gte('limite_credit', parseFloat(filters.minCredit));
      }
      if (filters.maxCredit) {
        query = query.lte('limite_credit', parseFloat(filters.maxCredit));
      }

      // Add pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error: fetchError, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;
      setClients(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Reload clients after successful deletion
      loadClients(searchTerm);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setShowCreateForm(true);
  };

  const handleCreateAccount = (client: Client) => {
    setSelectedClient(client);
    setShowRegisterForm(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (loading && !clients.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Clients</h1>
          <p className="text-sm text-gray-500">{totalCount} client{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => {
            setSelectedClient(null);
            setShowCreateForm(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau Client
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher par ID, nom, email ou téléphone..."
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
                Type de client
              </label>
              <select
                className="input"
                value={filters.type}
                onChange={(e) => {
                  setFilters({ ...filters, type: e.target.value });
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tous</option>
                <option value="company">Entreprises</option>
                <option value="individual">Particuliers</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limite crédit min
              </label>
              <input
                type="number"
                className="input"
                value={filters.minCredit}
                onChange={(e) => {
                  setFilters({ ...filters, minCredit: e.target.value });
                  setCurrentPage(1);
                }}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limite crédit max
              </label>
              <input
                type="number"
                className="input"
                value={filters.maxCredit}
                onChange={(e) => {
                  setFilters({ ...filters, maxCredit: e.target.value });
                  setCurrentPage(1);
                }}
                placeholder="1000000"
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

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Limite de crédit
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de création
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Aucun client trouvé
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-primary-600 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {client.entreprise || client.nom}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span className="font-medium">{client.client_id}</span>
                            {client.entreprise && (
                              <span>• {client.nom}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {client.email && (
                          <div className="flex items-center mb-1">
                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                            {client.email}
                          </div>
                        )}
                        {client.telephone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            {client.telephone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end">
                        <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(client.limite_credit)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleCreateAccount(client)}
                          className="btn btn-secondary p-2 hover:bg-blue-50"
                          title="Créer un compte"
                        >
                          <UserPlus className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleEdit(client)}
                          className="btn btn-secondary p-2 hover:bg-yellow-50"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4 text-yellow-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="btn btn-secondary p-2 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} sur {totalCount} clients
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary px-2"
            >
              «
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary px-2"
            >
              »
            </button>
          </div>
        </div>
      )}

      {showCreateForm && (
        <ClientForm
          client={selectedClient}
          onClose={() => {
            setShowCreateForm(false);
            setSelectedClient(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setSelectedClient(null);
            loadClients(searchTerm);
          }}
        />
      )}

      {showRegisterForm && selectedClient && (
        <ClientRegisterForm
          client={selectedClient}
          onClose={() => {
            setShowRegisterForm(false);
            setSelectedClient(null);
          }}
          onSuccess={() => {
            setShowRegisterForm(false);
            setSelectedClient(null);
            loadClients(searchTerm);
          }}
        />
      )}
    </div>
  );
};

export default ClientList;