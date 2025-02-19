import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertCircle, Building2, Edit, Trash2, ChevronLeft, ChevronRight, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../config/supabase';
import BrandForm from './BrandForm';

interface Brand {
  id: string;
  name: string;
  abbreviation: string | null;
  description: string | null;
  website: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

const BrandList: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  useEffect(() => {
    loadBrands();
  }, [currentPage, searchTerm]);

  const loadBrands = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('brands')
        .select('id, name, abbreviation, description, website, created_at', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%, abbreviation.ilike.%${searchTerm}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await query
        .range(from, to)
        .order('name', { ascending: true });

      if (error) throw error;
      setBrands(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette marque ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadBrands();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setShowCreateForm(true);
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Marques</h1>
          <p className="text-sm text-gray-500">{totalCount} marque{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => {
            setEditingBrand(null);
            setShowCreateForm(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvelle Marque
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une marque..."
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
                  Abréviation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site Web
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {brands.map((brand) => (
                <tr key={brand.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="font-medium text-gray-900">{brand.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {brand.abbreviation || '-'}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-500">{brand.description || 'Aucune description'}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {brand.website ? (
                      <a 
                        href={brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900"
                        title={brand.website}
                      >
                        <LinkIcon className="h-5 w-5 inline" />
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(brand)}
                      className="btn btn-secondary p-2"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4 text-yellow-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(brand.id)}
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
        <BrandForm
          onClose={() => {
            setShowCreateForm(false);
            setEditingBrand(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setEditingBrand(null);
            loadBrands();
          }}
          brand={editingBrand}
        />
      )}
    </div>
  );
};

export default BrandList;