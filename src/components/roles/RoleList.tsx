import React, { useState, useEffect } from 'react';
import { Search, Plus, AlertCircle, Shield, Lock } from 'lucide-react';
import RoleForm from './RoleForm';
import { supabase } from '../../config/supabase';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

const DEFAULT_ROLES = [
  {
    name: 'administrateur',
    description: 'Accès complet à tous les modules',
    permissions: ['admin.full_access']
  },
  {
    name: 'commercial',
    description: 'Gestion des clients et devis',
    permissions: [
      'clients.view', 'clients.create', 'clients.edit',
      'articles.view',
      'factures.view', 'factures.create'
    ]
  },
  {
    name: 'caisse',
    description: 'Gestion de la caisse',
    permissions: [
      'caisse.view', 'caisse.encaisser', 'caisse.decaisser',
      'factures.view'
    ]
  },
  {
    name: 'stock',
    description: 'Gestion du stock',
    permissions: [
      'articles.view', 'articles.edit',
      'stock.view', 'stock.adjust', 'stock.transfer'
    ]
  },
  {
    name: 'compta',
    description: 'Gestion de la comptabilité',
    permissions: [
      'factures.view', 'factures.validate',
      'caisse.view',
      'rapports.view', 'rapports.export'
    ]
  }
];

const RoleList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get existing roles
      const { data: existingRoles, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Check if default roles need to be created
      const missingRoles = DEFAULT_ROLES.filter(defaultRole => 
        !existingRoles?.some(role => role.name === defaultRole.name)
      );

      if (missingRoles.length > 0) {
        const { error: createError } = await supabase
          .from('roles')
          .insert(missingRoles);

        if (createError) throw createError;

        // Reload roles after creating defaults
        const { data: updatedRoles, error: reloadError } = await supabase
          .from('roles')
          .select('*')
          .order('created_at', { ascending: false });

        if (reloadError) throw reloadError;
        setRoles(updatedRoles || []);
      } else {
        setRoles(existingRoles || []);
      }

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadRoles();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEdit = (id: string) => {
    setSelectedRole(id);
    setShowCreateForm(true);
  };

  const getPermissionCount = (permissions: string[]): { [key: string]: number } => {
    return permissions.reduce((acc, permission) => {
      const [module] = permission.split('.');
      acc[module] = (acc[module] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  };

  const getPermissionLabel = (module: string, count: number): string => {
    const labels: { [key: string]: string } = {
      admin: 'Administrateur',
      users: 'Utilisateurs',
      clients: 'Clients',
      articles: 'Articles',
      stock: 'Stock',
      factures: 'Factures',
      devis: 'Devis',
      tickets: 'Tickets',
      caisse: 'Caisse',
      banque: 'Banque',
      rapports: 'Rapports',
      parametres: 'Paramètres'
    };

    return `${labels[module] || module} (${count})`;
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
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Rôles</h1>
        <button
          onClick={() => {
            setSelectedRole(null);
            setShowCreateForm(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau Rôle
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un rôle..."
              className="input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => {
          const permissionCounts = getPermissionCount(role.permissions);
          const isAdmin = role.name === 'administrateur';
          
          return (
            <div key={role.id} className="card overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Shield className={`h-8 w-8 ${isAdmin ? 'text-red-600' : 'text-primary-600'}`} />
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {role.name}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    {role.description}
                  </p>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center">
                      <Lock className="h-4 w-4 mr-1" />
                      Permissions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(permissionCounts).map(([module, count]) => (
                        <span
                          key={module}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            module === 'admin' 
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {getPermissionLabel(module, count)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(role.id)}
                      className="btn btn-secondary"
                    >
                      Modifier
                    </button>
                    {!isAdmin && (
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="btn btn-secondary text-red-600 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreateForm && (
        <RoleForm
          roleId={selectedRole}
          onClose={() => {
            setShowCreateForm(false);
            setSelectedRole(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setSelectedRole(null);
            loadRoles();
          }}
        />
      )}
    </div>
  );
};

export default RoleList;