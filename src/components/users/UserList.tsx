import React, { useState, useEffect } from 'react';
import { Search, Plus, AlertCircle, UserCog, Shield, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import UserForm from './UserForm';

interface User {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  confirmed_at: string | null;
  last_sign_in_at: string | null;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: existingUsers, error: usersError } = await supabase
        .from('user_profiles_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(existingUsers || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      setError(null);

      // First check if user is an admin
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (userProfile?.role === 'administrateur') {
        throw new Error('Impossible de supprimer un administrateur');
      }

      // Delete user profile first (will cascade to auth.users)
      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        if (deleteError.message.includes('permission denied')) {
          throw new Error('Vous n\'avez pas les permissions nécessaires pour supprimer des utilisateurs');
        }
        throw deleteError;
      }
      
      // Create audit log entry
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert([{
          table_name: 'user_profiles',
          operation_type: 'DELETE',
          old_data: { user_id: userId }
        }]);

      if (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      // Reload users after successful deletion
      loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la suppression');
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowCreateForm(true);
  };

  const handleStatusToggle = async (userId: string, isActive: boolean) => {
    try {
      setError(null);

      // First check if user is an admin
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (userProfile?.role === 'administrateur') {
        throw new Error('Impossible de désactiver un administrateur');
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          is_active: !isActive,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        if (error.message.includes('permission denied')) {
          throw new Error('Vous n\'avez pas les permissions nécessaires pour modifier les utilisateurs');
        }
        throw error;
      }
      
      // Create audit log entry
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert([{
          table_name: 'user_profiles',
          operation_type: 'UPDATE',
          new_data: { is_active: !isActive }
        }]);

      if (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      // Reload users after status update
      loadUsers();
    } catch (err) {
      console.error('Error updating user status:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la mise à jour');
    }
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role.toLowerCase()) {
      case 'administrateur':
        return 'bg-red-100 text-red-800';
      case 'commercial':
        return 'bg-green-100 text-green-800';
      case 'comptable':
        return 'bg-blue-100 text-blue-800';
      case 'stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'caisse':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      (user.first_name?.toLowerCase() || '').includes(searchLower) ||
      (user.last_name?.toLowerCase() || '').includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-sm text-gray-500">{users.length} utilisateur{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => {
            setSelectedUser(null);
            setShowCreateForm(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvel Utilisateur
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
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
        {filteredUsers.map((user) => (
          <div key={user.user_id} className="card overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  {user.role === 'administrateur' ? (
                    <Shield className="h-8 w-8 text-red-600" />
                  ) : (
                    <UserCog className="h-8 w-8 text-primary-600" />
                  )}
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {user.first_name} {user.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">{user.username}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Rôle</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Dernière connexion</p>
                  <p className="text-sm">{formatDate(user.last_sign_in_at)}</p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleStatusToggle(user.user_id, user.is_active)}
                    className={`btn btn-secondary p-2 ${user.role === 'administrateur' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={user.is_active ? 'Désactiver' : 'Activer'}
                    disabled={user.role === 'administrateur'}
                  >
                    {user.is_active ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(user)}
                    className="btn btn-secondary p-2"
                    title="Modifier"
                  >
                    <Edit className="h-4 w-4 text-yellow-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(user.user_id)}
                    className={`btn btn-secondary p-2 ${user.role === 'administrateur' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Supprimer"
                    disabled={user.role === 'administrateur'}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateForm && (
        <UserForm
          onClose={() => {
            setShowCreateForm(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setSelectedUser(null);
            loadUsers();
          }}
          user={selectedUser}
        />
      )}
    </div>
  );
};

export default UserList;