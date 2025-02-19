import React, { useState } from 'react';
import ClientList from './clients/ClientList';
import ClientForm from './clients/ClientForm';

interface Client {
  id: string;
  client_id?: string;
  nom: string;
  entreprise?: string;
  email?: string;
  telephone?: string;
  limite_credit: number;
}

const Clients: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setShowCreateForm(true);
  };

  return (
    <div>
      <ClientList 
        onNewClient={() => {
          setSelectedClient(null);
          setShowCreateForm(true);
        }}
        onEdit={handleEdit}
      />
      
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
          }}
        />
      )}
    </div>
  );
};

export default Clients;