import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertCircle, FolderTree, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../config/supabase';
import CategoryForm from './CategoryForm';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    hasDescription: '',
    orderMin: '',
    orderMax: '',
    dateStart: '',
    dateEnd: ''
  });

  useEffect(() => {
    loadCategories();
  }, [currentPage, searchTerm, filters]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('categories')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply filters
      if (filters.hasDescription === 'yes') {
        query = query.not('description', 'is', null);
      } else if (filters.hasDescription === 'no') {
        query = query.is('description', null);
      }

      if (filters.orderMin) {
        query = query.gte('order', parseInt(filters.orderMin));
      }
      if (filters.orderMax) {
        query = query.lte('order', parseInt(filters.orderMax));
      }
      if (filters.dateStart) {
        query = query.gte('created_at', filters.dateStart);
      }
      if (filters.dateEnd) {
        query = query.lte('created_at', filters.dateEnd);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await query
        .order('order', { ascending: true })
        .range(from, to);

      if (error) throw error;
      setCategories(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadCategories();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEdit = (category: Category) => {
    // TODO: Implement edit functionality
    console.log('Edit category:', category);
  };

  const resetFilters = () => {
    setFilters({
      hasDescription: '',
      orderMin: '',
      orderMax: '',
      dateStart: '',
      dateEnd: ''
    });
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catégories</h1>
          <p className="text-sm text-gray-500">{totalCount} catégorie{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvelle catégorie
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une catégorie..."
              className="input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Filter className="h-5 w-5 mr-2" />
          Filtres {showFilters ? 'actifs' : ''}
        </button>
      </div>

      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <select
                className="input"
                value={filters.hasDescription}
                onChange={(e) => setFilters({ ...filters, hasDescription: e.target.value })}
              >
                <option value="">Tous</option>
                <option value="yes">Avec description</option>
                <option value="no">Sans description</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordre minimum
              </label>
              <input
                type="number"
                className="input"
                value={filters.orderMin}
                onChange={(e) => setFilters({ ...filters, orderMin: e.target.value })}
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordre maximum
              </label>
              <input
                type="number"
                className="input"
                value={filters.orderMax}
                onChange={(e) => setFilters({ ...filters, orderMax: e.target.value })}
                min="0"
              />
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

          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="btn btn-secondary"
            >
              Réinitialiser les filtres
            </button>
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

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ordre
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FolderTree className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="font-medium text-gray-900">{category.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-500">{category.description || 'Aucune description'}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm text-gray-500">{category.order}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="btn btn-secondary p-2"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4 text-yellow-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="btn btn-secondary p-2"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>Page {currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-secondary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {showCreateForm && (
        <CategoryForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadCategories();
          }}
        />
      )}
    </div>
  );
};

export default Categories;