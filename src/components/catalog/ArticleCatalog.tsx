import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, AlertCircle, Package, Eye, Image, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../config/supabase';
import ArticleHistory from './ArticleHistory';
import { formatCurrency } from '../../utils/formatters';
import { debounce } from 'lodash';

interface ArticleCatalogProps {
  hideStock?: boolean;
}

interface Article {
  id: string;
  cb: string;
  cb_ref?: string;
  nom: string;
  prixd: number;
  stock: number;
  avatar?: string;
  emplacement?: string;
  type_stock?: string;
  brand?: {
    name: string;
  };
  category?: {
    name: string;
  };
}

interface SearchResult {
  article: Article;
  matchType: 'code' | 'name' | 'reference';
  matchedText: string;
  matchPosition: number;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 12;

const ArticleCatalog: React.FC<ArticleCatalogProps> = ({ hideStock = false }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    type: '',
    minStock: '',
    maxStock: '',
    minPrice: '',
    maxPrice: '',
    hasLocation: ''
  });

  useEffect(() => {
    Promise.all([
      loadCategories(),
      loadBrands()
    ]).catch(err => {
      console.error('Error loading filters:', err);
    });
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    setCategories(data || []);
  };

  const loadBrands = async () => {
    const { data } = await supabase
      .from('brands')
      .select('id, name')
      .order('name');
    setBrands(data || []);
  };

  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term) {
        setSearchResults([]);
        setShowSearchResults(false);
        loadArticles();
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('articles')
          .select(`
            *,
            brand:marque_id(name),
            category:categorie_article_id(name)
          `)
          .or(`nom.ilike.%${term}%,cb.ilike.%${term}%,cb_ref.ilike.%${term}%`)
          .limit(10);

        if (error) throw error;

        const results: SearchResult[] = (data || []).map(article => {
          let matchType: 'code' | 'name' | 'reference' = 'name';
          let matchedText = article.nom;
          let matchPosition = article.nom.toLowerCase().indexOf(term.toLowerCase());

          if (article.cb.toLowerCase() === term.toLowerCase()) {
            matchType = 'code';
            matchedText = article.cb;
            matchPosition = 0;
          } else if (article.cb_ref?.toLowerCase() === term.toLowerCase()) {
            matchType = 'reference';
            matchedText = article.cb_ref;
            matchPosition = 0;
          } else {
            const cbMatch = article.cb.toLowerCase().indexOf(term.toLowerCase());
            const refMatch = article.cb_ref?.toLowerCase().indexOf(term.toLowerCase()) ?? -1;
            const nameMatch = article.nom.toLowerCase().indexOf(term.toLowerCase());

            if (cbMatch !== -1) {
              matchType = 'code';
              matchedText = article.cb;
              matchPosition = cbMatch;
            } else if (refMatch !== -1) {
              matchType = 'reference';
              matchedText = article.cb_ref!;
              matchPosition = refMatch;
            } else if (nameMatch !== -1) {
              matchType = 'name';
              matchedText = article.nom;
              matchPosition = nameMatch;
            }
          }

          return {
            article,
            matchType,
            matchedText,
            matchPosition
          };
        });

        results.sort((a, b) => {
          const aExact = a.matchedText.toLowerCase() === term.toLowerCase();
          const bExact = b.matchedText.toLowerCase() === term.toLowerCase();
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          return a.matchPosition - b.matchPosition;
        });

        setSearchResults(results);
        setShowSearchResults(true);
        setArticles([]);
        setTotalArticles(0);
      } catch (err) {
        console.error('Error searching articles:', err);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    } else {
      loadArticles();
    }
    return () => debouncedSearch.cancel();
  }, [searchTerm]);

  useEffect(() => {
    if (!searchTerm) {
      loadArticles();
    }
  }, [filters, currentPage]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('articles')
        .select(`
          *,
          brand:marque_id(name),
          category:categorie_article_id(name)
        `, { count: 'exact' });

      if (filters.category) {
        query = query.eq('categorie_article_id', filters.category);
      }
      if (filters.brand) {
        query = query.eq('marque_id', filters.brand);
      }
      if (filters.type) {
        query = query.eq('type_stock', filters.type);
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
      if (filters.hasLocation === 'yes') {
        query = query.not('emplacement', 'is', null);
      } else if (filters.hasLocation === 'no') {
        query = query.is('emplacement', null);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error: fetchError, count } = await query
        .order('nom')
        .range(from, to);

      if (fetchError) throw fetchError;
      setArticles(data || []);
      setTotalArticles(count || 0);
      setSearchResults([]);
      setShowSearchResults(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (article: Article) => {
    setSelectedArticle(article);
    setShowHistoryModal(true);
  };

  const handleImageClick = (imageUrl: string) => {
    setPreviewImage(imageUrl);
  };

  const handleSearchResultClick = (result: SearchResult) => {
    setSearchTerm('');
    setShowSearchResults(false);
    setArticles([result.article]);
    setTotalArticles(1);
  };

  const handleSearchFocus = () => {
    if (searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  const handleSearchBlur = () => {
    setTimeout(() => setShowSearchResults(false), 200);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    loadArticles();
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      brand: '',
      type: '',
      minStock: '',
      maxStock: '',
      minPrice: '',
      maxPrice: '',
      hasLocation: ''
    });
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalArticles / ITEMS_PER_PAGE);

  if (loading && !articles.length && !searchResults.length) {
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
          <h1 className="text-2xl font-bold text-gray-900">Catalogue Articles</h1>
          <p className="text-sm text-gray-500">
            {searchResults.length > 0 
              ? `${searchResults.length} résultat${searchResults.length > 1 ? 's' : ''} trouvé${searchResults.length > 1 ? 's' : ''}`
              : `${totalArticles} article${totalArticles !== 1 ? 's' : ''}`
            }
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par nom, code barre ou référence..."
                className="input pl-10 pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-96 overflow-auto">
                <ul className="py-1 divide-y divide-gray-200">
                  {searchResults.map((result) => (
                    <li
                      key={result.article.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {result.article.nom}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                result.matchType === 'code' ? 'bg-blue-100 text-blue-800' :
                                result.matchType === 'reference' ? 'bg-purple-100 text-purple-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {result.matchType === 'code' ? 'Code' :
                                 result.matchType === 'reference' ? 'Réf' :
                                 'Nom'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              <span className="inline-block mr-3">
                                Code: {result.article.cb}
                              </span>
                              {result.article.cb_ref && (
                                <span className="inline-block">
                                  Réf: {result.article.cb_ref}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-medium text-gray-900">
                              {formatCurrency(result.article.prixd)}
                            </div>
                            {!hideStock && (
                              <div className={`text-sm ${
                                result.article.stock > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                Stock: {result.article.stock}
                              </div>
                            )}
                          </div>
                        </div>
                        {result.article.emplacement && (
                          <div className="mt-1 text-sm text-gray-500">
                            Emplacement: {result.article.emplacement}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                Marque
              </label>
              <select
                className="input"
                value={filters.brand}
                onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
              >
                <option value="">Toutes les marques</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                className="input"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <option value="">Toutes les catégories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de stock
              </label>
              <select
                className="input"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">Tous les types</option>
                <option value="O">Original</option>
                <option value="N">Non Original</option>
                <option value="S">Service</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock minimum
              </label>
              <input
                type="number"
                className="input"
                value={filters.minStock}
                onChange={(e) => setFilters({ ...filters, minStock: e.target.value })}
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
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emplacement
              </label>
              <select
                className="input"
                value={filters.hasLocation}
                onChange={(e) => setFilters({ ...filters, hasLocation: e.target.value })}
              >
                <option value="">Tous</option>
                <option value="yes">Avec emplacement</option>
                <option value="no">Sans emplacement</option>
              </select>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {(searchResults.length > 0 ? searchResults.map(r => r.article) : articles).map((article) => (
          <div key={article.id} className="card overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-square w-full bg-gray-100 relative group">
              {article.avatar ? (
                <>
                  <img
                    src={article.avatar}
                    alt={article.nom}
                    className="w-full h-full object-contain p-4"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const div = document.createElement('div');
                        div.className = 'w-full h-full flex items-center justify-center';
                        div.innerHTML = '<svg class="h-16 w-16 text-gray-400" ...></svg>';
                        parent.appendChild(div);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleImageClick(article.avatar!)}
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
                  >
                    <Image className="h-8 w-8 text-white" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{article.nom}</h3>
                <p className="text-sm text-gray-500">{article.cb}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Prix:</span>
                  <span className="font-medium">{formatCurrency(article.prixd)}</span>
                </div>
                {!hideStock && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Stock:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      article.stock > 10 
                        ? 'bg-green-100 text-green-800'
                        : article.stock > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {article.stock}
                    </span>
                  </div>
                )}
                {article.emplacement && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Emplacement:</span>
                    <span className="font-medium">{article.emplacement}</span>
                  </div>
                )}
                {article.type_stock && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium">
                      {article.type_stock === 'O' ? 'Original' : 
                       article.type_stock === 'N' ? 'Non Original' : 'Service'}
                    </span>
                  </div>
                )}
                {article.brand && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Marque:</span>
                    <span className="font-medium">{article.brand.name}</span>
                  </div>
                )}
                {article.category && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Catégorie:</span>
                    <span className="font-medium">{article.category.name}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleViewHistory(article)}
                  className="btn btn-secondary"
                  title="Voir l'historique"
                >
                  <Eye className="h-4 w-4 text-blue-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!searchTerm && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, totalArticles)} sur {totalArticles} articles
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary p-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 py-2">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary p-2"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {showHistoryModal && selectedArticle && (
        <ArticleHistory
          articleId={selectedArticle.id}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedArticle(null);
          }}
        />
      )}

      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative bg-white rounded-lg p-2 max-w-4xl max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImage}
              alt="Aperçu de l'article"
              className="max-h-[80vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleCatalog;