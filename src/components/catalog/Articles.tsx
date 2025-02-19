import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertCircle, Package, Edit, Trash2, PlusCircle, Image, History } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';
import ArticleForm from './ArticleForm';
import ArticleHistory from './ArticleHistory';

interface Article {
  id: string;
  cb: string;
  nom: string;
  emplacement: string;
  prixd: number;
  stock: number;
  avatar?: string;
}

const Articles: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    minStock: '',
    maxStock: '',
    minPrice: '',
    maxPrice: '',
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadArticles();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filters]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('articles')
        .select('*');

      // Apply search filter
      if (searchTerm) {
        query = query.or(`nom.ilike.%${searchTerm}%,cb.ilike.%${searchTerm}%,cb_ref.ilike.%${searchTerm}%`);
      }

      // Apply other filters
      if (filters.category) {
        query = query.eq('categorie_article_id', filters.category);
      }
      if (filters.brand) {
        query = query.eq('marque_id', filters.brand);
      }
      if (filters.minStock) {
        query = query.gte('stock', parseInt(filters.minStock));
      }
      if (filters.maxStock) {
        query = query.lte('stock', parseInt(filters.maxStock));
      }
      if (filters.minPrice) {
        query = query.gte('prixd', parseInt(filters.minPrice));
      }
      if (filters.maxPrice) {
        query = query.lte('prixd', parseInt(filters.maxPrice));
      }

      const { data, error: fetchError } = await query
        .order('nom');

      if (fetchError) throw fetchError;
      setArticles(data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadArticles();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEdit = (article: Article) => {
    // TODO: Implement edit functionality
    console.log('Edit article:', article);
  };

  const handleAddStock = (article: Article) => {
    // TODO: Implement add stock functionality
    console.log('Add stock to article:', article);
  };

  const handleImageClick = (imageUrl: string) => {
    setPreviewImage(imageUrl);
  };

  const handleViewHistory = (article: Article) => {
    setSelectedArticle(article);
    setShowHistoryModal(true);
  };

  if (loading && !articles.length) {
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
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="text-sm text-gray-500">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvel Article
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher par nom, code barre ou référence..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock minimum
              </label>
              <input
                type="number"
                className="input"
                value={filters.minStock}
                onChange={(e) => setFilters({ ...filters, minStock: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock maximum
              </label>
              <input
                type="number"
                className="input"
                value={filters.maxStock}
                onChange={(e) => setFilters({ ...filters, maxStock: e.target.value })}
                placeholder="1000"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix minimum
              </label>
              <input
                type="number"
                className="input"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix maximum
              </label>
              <input
                type="number"
                className="input"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                placeholder="1000000"
                min="0"
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

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code Barre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emplacement
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Vente
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {article.cb}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      {article.avatar ? (
                        <button
                          onClick={() => handleImageClick(article.avatar!)}
                          className="text-primary-600 hover:text-primary-700 mr-2"
                          title="Voir l'image"
                        >
                          <Image className="h-5 w-5" />
                        </button>
                      ) : (
                        <Package className="h-5 w-5 text-gray-400 mr-2" />
                      )}
                      <div className="text-sm font-medium text-gray-900">
                        {article.nom}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {article.emplacement || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                    {formatCurrency(article.prixd)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      article.stock > 10 
                        ? 'bg-green-100 text-green-800'
                        : article.stock > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {article.stock}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewHistory(article)}
                        className="btn btn-secondary p-2"
                        title="Historique"
                      >
                        <History className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleAddStock(article)}
                        className="btn btn-secondary p-2"
                        title="Ajouter au stock"
                      >
                        <PlusCircle className="h-4 w-4 text-green-600" />
                      </button>
                      <button
                        onClick={() => handleEdit(article)}
                        className="btn btn-secondary p-2"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4 text-yellow-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="btn btn-secondary p-2"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateForm && (
        <ArticleForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadArticles();
          }}
        />
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative bg-white rounded-lg p-2 max-w-3xl max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100"
            >
              <span className="sr-only">Fermer</span>
              ×
            </button>
            <img
              src={previewImage}
              alt="Aperçu de l'article"
              className="max-h-[80vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}

      {/* Article History Modal */}
      {showHistoryModal && selectedArticle && (
        <ArticleHistory
          articleId={selectedArticle.id}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedArticle(null);
          }}
        />
      )}
    </div>
  );
};

export default Articles;