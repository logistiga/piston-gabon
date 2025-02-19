import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Lock } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface RoleFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  roleId?: string;
}

const AVAILABLE_PERMISSIONS = {
  'client': [
    'client.view_own',
    'client.edit_own',
    'client.view_catalog',
    'client.place_order',
    'client.view_orders',
    'client.view_invoices',
    'client.download_documents'
  ],
  'admin': [
    'admin.full_access'
  ],
  'users': [
    'users.view', 'users.create', 'users.edit', 'users.delete'
  ],
  'clients': [
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete'
  ],
  'articles': [
    'articles.view', 'articles.create', 'articles.edit', 'articles.delete',
    'articles.import', 'articles.export'
  ],
  'stock': [
    'stock.view', 'stock.adjust', 'stock.transfer', 'stock.inventory'
  ],
  'factures': [
    'factures.view', 'factures.create', 'factures.edit', 'factures.delete',
    'factures.validate', 'factures.cancel', 'factures.print'
  ],
  'devis': [
    'devis.view', 'devis.create', 'devis.edit', 'devis.delete',
    'devis.validate', 'devis.convert'
  ],
  'tickets': [
    'tickets.view', 'tickets.create', 'tickets.edit', 'tickets.delete',
    'tickets.validate', 'tickets.cancel', 'tickets.print'
  ],
  'caisse': [
    'caisse.view', 'caisse.encaisser', 'caisse.decaisser', 'caisse.report'
  ],
  'banque': [
    'banque.view', 'banque.deposit', 'banque.withdraw', 'banque.transfer'
  ],
  'rapports': [
    'rapports.view', 'rapports.export', 'rapports.print'
  ],
  'parametres': [
    'parametres.view', 'parametres.edit', 'parametres.taxes',
    'parametres.company', 'parametres.backup'
  ]
};

const RoleForm: React.FC<RoleFormProps> = ({ onClose, onSuccess, roleId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  useEffect(() => {
    if (roleId) {
      loadRole();
    }
  }, [roleId]);

  const loadRole = async () => {
    try {
      setInitialLoading(true);
      setError(null);

      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (roleError) throw roleError;

      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || []
      });

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      setError('Le nom du rôle est requis');
      return;
    }

    if (formData.permissions.length === 0) {
      setError('Sélectionnez au moins une permission');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (roleId) {
        // Update existing role
        const { error: updateError } = await supabase
          .from('roles')
          .update({
            name: formData.name,
            description: formData.description,
            permissions: formData.permissions,
            updated_at: new Date().toISOString()
          })
          .eq('id', roleId);

        if (updateError) throw updateError;
      } else {
        // Create new role
        const { error: createError } = await supabase
          .from('roles')
          .insert([{
            name: formData.name,
            description: formData.description,
            permissions: formData.permissions
          }]);

        if (createError) throw createError;
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const toggleAllPermissions = (category: string) => {
    const categoryPermissions = AVAILABLE_PERMISSIONS[category as keyof typeof AVAILABLE_PERMISSIONS];
    const allSelected = categoryPermissions.every(p => formData.permissions.includes(p));

    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !categoryPermissions.includes(p))
        : [...new Set([...prev.permissions, ...categoryPermissions])]
    }));
  };

  const getPermissionLabel = (permission: string): string => {
    const labels: { [key: string]: string } = {
      'view_own': 'Voir son profil',
      'edit_own': 'Modifier son profil',
      'view_catalog': 'Voir le catalogue',
      'place_order': 'Passer commande',
      'view_orders': 'Voir ses commandes',
      'view_invoices': 'Voir ses factures',
      'download_documents': 'Télécharger documents',
      'full_access': 'Accès complet',
      'view': 'Voir',
      'create': 'Créer',
      'edit': 'Modifier',
      'delete': 'Supprimer',
      'validate': 'Valider',
      'cancel': 'Annuler',
      'print': 'Imprimer',
      'export': 'Exporter',
      'import': 'Importer',
      'adjust': 'Ajuster',
      'transfer': 'Transférer',
      'inventory': 'Inventaire',
      'encaisser': 'Encaisser',
      'decaisser': 'Décaisser',
      'report': 'Rapport',
      'deposit': 'Dépôt',
      'withdraw': 'Retrait',
      'convert': 'Convertir',
      'taxes': 'Taxes',
      'company': 'Société',
      'backup': 'Sauvegarde'
    };

    const [module, action] = permission.split('.');
    return `${labels[action] || action}`;
  };

  if (initialLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {roleId ? 'Modifier le Rôle' : 'Nouveau Rôle'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du Rôle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="input min-h-[100px]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du rôle..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Lock className="h-4 w-4 mr-1" />
                Permissions
              </label>

              <div className="space-y-6">
                {Object.entries(AVAILABLE_PERMISSIONS).map(([category, permissions]) => (
                  <div key={category} className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900 capitalize">
                        {category}
                      </h3>
                      <button
                        type="button"
                        onClick={() => toggleAllPermissions(category)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Tout {permissions.every(p => formData.permissions.includes(p)) ? 'désélectionner' : 'sélectionner'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {permissions.map((permission) => (
                        <label
                          key={permission}
                          className="flex items-center space-x-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission)}
                            onChange={() => togglePermission(permission)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span>{getPermissionLabel(permission)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⌛</span>
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoleForm;