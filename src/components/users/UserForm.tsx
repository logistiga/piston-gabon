import React, { useState } from 'react';
import { X, AlertCircle, UserPlus, Shield, Key } from 'lucide-react';
import { supabase, supabaseAdmin } from '../../config/supabase';

interface UserFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  user?: {
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
  } | null;
}

const AVAILABLE_ROLES = [
  { id: 'administrateur', label: 'Administrateur', icon: Shield },
  { id: 'commercial', label: 'Commercial', icon: UserPlus },
  { id: 'comptable', label: 'Comptable', icon: UserPlus },
  { id: 'stock', label: 'Stock', icon: UserPlus },
  { id: 'caisse', label: 'Caisse', icon: UserPlus }
];

const UserForm: React.FC<UserFormProps> = ({ onClose, onSuccess, user }) => {
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    password: '',
    newPassword: '',
    confirmPassword: '',
    role: user?.role || 'commercial',
    is_active: user?.is_active ?? true
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.email) {
        throw new Error('L\'email est requis');
      }

      if (!user && !formData.password) {
        throw new Error('Le mot de passe est requis pour un nouvel utilisateur');
      }

      if (!user && formData.password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      // Validate password change if enabled
      if (showPasswordChange) {
        if (!formData.newPassword) {
          throw new Error('Le nouveau mot de passe est requis');
        }
        if (formData.newPassword.length < 6) {
          throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
        }
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
      }

      if (user) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            first_name: formData.first_name || null,
            last_name: formData.last_name || null,
            role: formData.role,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id);

        if (updateError) throw updateError;

        // Update password if requested
        if (showPasswordChange && formData.newPassword) {
          if (!supabaseAdmin) {
            throw new Error('Service role key required for password updates');
          }

          const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
            user.user_id,
            { password: formData.newPassword }
          );

          if (passwordError) throw passwordError;
        }

      } else {
        // Check for existing user
        const { data: existingUser } = await supabase
          .from('user_profiles_view')
          .select('email')
          .eq('email', formData.email)
          .maybeSingle();

        if (existingUser) {
          throw new Error('Un utilisateur avec cet email existe déjà');
        }

        if (!supabaseAdmin) {
          throw new Error('Service role key required for user creation');
        }

        // Create auth user first
        const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
          user_metadata: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role
          }
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('Erreur lors de la création du compte');

        try {
          // Create user profile
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([{
              user_id: authData.user.id,
              first_name: formData.first_name || null,
              last_name: formData.last_name || null,
              username: formData.email.split('@')[0],
              role: formData.role,
              is_active: formData.is_active
            }]);

          if (profileError) throw profileError;

        } catch (err) {
          // Rollback auth user on profile creation failure
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          throw err;
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error managing user:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary-600" />
              <h2 className="text-xl font-semibold">
                {user ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}
              </h2>
            </div>
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
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!user}
                />
              </div>

              {!user ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Minimum 6 caractères
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Mot de passe
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Key className="h-4 w-4" />
                      {showPasswordChange ? 'Annuler' : 'Modifier'}
                    </button>
                  </div>

                  {showPasswordChange && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nouveau mot de passe <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          className="input"
                          value={formData.newPassword}
                          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                          required={showPasswordChange}
                          minLength={6}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirmer le mot de passe <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          className="input"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          required={showPasswordChange}
                          minLength={6}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rôle <span className="text-red-500">*</span>
                </label>
                <select
                  className="input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  {AVAILABLE_ROLES.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-gray-700">Compte actif</span>
                </label>
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

export default UserForm;