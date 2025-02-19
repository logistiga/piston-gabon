import React, { useState, useEffect } from 'react';
import { Plus, Search, CheckCircle, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../config/supabase';
import QuickClientForm from './QuickClientForm';

interface Client {
  id: string;
  nom: string;
  entreprise?: string;
  email?: string;
  telephone?: string;
}

interface ClientSearchProps {
  onSelect: (client: Client) => void;
  selectedClient?: Client;
  required?: boolean;
  showQuickAdd?: boolean;
}

const ClientSearch: React.FC<ClientSearchProps> = ({
  onSelect,
  selectedClient,
  required = false,
  showQuickAdd = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientExists, setClientExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchClients();
    } else {
      setResults([]);
      setClientExists(null);
    }
  }, [searchTerm]);

  const searchClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: searchError } = await supabase
        .from('clients')
        .select('*')
        .or(`nom.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telephone.ilike.%${searchTerm}%`)
        .limit(5);

      if (searchError) throw searchError;

      setResults(data || []);
      setClientExists(data && data.length > 0);
    } catch (err) {
      setError((err as Error).message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickClientSuccess = (client: Client) => {
    onSelect(client);
    setSearchTerm('');
    setResults([]);
    setShowQuickForm(false);
    setClientExists(true);
  };

  const handleClearSelection = () => {
    onSelect({} as Client);
    setSearchTerm('');
    setResults([]);
    setClientExists(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher un client par nom, email ou téléphone..."
            className={`input pl-10 w-full ${required && !selectedClient ? 'border-red-300' : ''}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

          {results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
              <ul className="py-1 divide-y divide-gray-200">
                {results.map((client) => (
                  <li
                    key={client.id}
                    className="cursor-pointer hover:bg-gray-50 px-4 py-2"
                    onClick={() => {
                      onSelect(client);
                      setSearchTerm('');
                      setResults([]);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {client.entreprise ? `${client.entreprise} (${client.nom})` : client.nom}
                        </div>
                        {(client.email || client.telephone) && (
                          <div className="text-sm text-gray-500">
                            {client.email && <span className="mr-3">{client.email}</span>}
                            {client.telephone && <span>{client.telephone}</span>}
                          </div>
                        )}
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {searchTerm.length >= 2 && !loading && clientExists === false && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg p-4">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span>Aucun client trouvé</span>
              </div>
              {showQuickAdd && (
                <button
                  type="button"
                  onClick={() => setShowQuickForm(true)}
                  className="btn btn-primary w-full"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Créer "{searchTerm}" comme nouveau client
                </button>
              )}
            </div>
          )}
        </div>

        {showQuickAdd && (
          <button
            type="button"
            onClick={() => setShowQuickForm(true)}
            className="btn btn-primary whitespace-nowrap"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau Client
          </button>
        )}
      </div>

      {selectedClient && selectedClient.nom && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Client sélectionné</span>
              </div>
              <div className="font-medium text-gray-900">
                {selectedClient.entreprise 
                  ? `${selectedClient.entreprise} (${selectedClient.nom})` 
                  : selectedClient.nom
                }
              </div>
              {(selectedClient.email || selectedClient.telephone) && (
                <div className="text-sm text-gray-600 mt-1">
                  {selectedClient.email && <span className="mr-3">{selectedClient.email}</span>}
                  {selectedClient.telephone && <span>{selectedClient.telephone}</span>}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {required && !selectedClient?.nom && (
        <p className="text-sm text-red-600">
          Veuillez sélectionner un client ou en créer un nouveau
        </p>
      )}

      {showQuickForm && (
        <QuickClientForm
          onClose={() => setShowQuickForm(false)}
          onSuccess={handleQuickClientSuccess}
        />
      )}
    </div>
  );
};

export default ClientSearch;