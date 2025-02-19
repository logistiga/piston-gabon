import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertCircle } from 'lucide-react';
import { fetchSuppliers } from '../../services/supplierService';
import type { Supplier } from '../../types/supplier';
import SupplierForm from './SupplierForm';

const SupplierList: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadSuppliers();
  }, [currentPage]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, count } = await fetchSuppliers({
        page: currentPage,
        perPage: 20
      });
      setSuppliers(data);
      setTotalPages(Math.ceil(count / 20));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau fournisseur
        </button>
      </div>

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
                Pays
              </label>
              <select className="input">
                <option value="">Tous les pays</option>
                <option value="AE">Émirats Arabes Unis</option>
                <option value="CN">Chine</option>
                <option value="GA">Gabon</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ville
              </label>
              <input
                type="text"
                className="input"
                placeholder="Filtrer par ville"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select className="input">
                <option value="">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom Société
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom Fournisseur
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Adresse
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tel
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  {supplier.company_name}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {supplier.contact_name}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {supplier.address}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {supplier.phone}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right space-x-1">
                  <button className="btn btn-secondary px-2 py-1">
                    <span className="sr-only">Modifier</span>
                    <span className="text-yellow-600">✏️</span>
                  </button>
                  <button className="btn btn-secondary px-2 py-1">
                    <span className="sr-only">Supprimer</span>
                    <span className="text-red-600">🗑️</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Page {currentPage} sur {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary px-2"
            >
              «
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`btn ${
                  currentPage === i + 1
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'btn-secondary'
                }`}
              >
                {i + 1}
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
        <SupplierForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadSuppliers();
          }}
        />
      )}
    </div>
  );
};

export default SupplierList;