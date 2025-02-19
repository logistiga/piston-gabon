import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Package } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface Article {
  id: string;
  cb: string;
  nom: string;
  prixd: number;
  stock: number;
  avatar?: string;
  emplacement?: string;
  type_stock?: string;
}

interface ArticleSearchProps {
  onSelect: (article: Article) => void;
  selectedArticle?: Article;
  required?: boolean;
  disabled?: boolean;
  allowZeroStock?: boolean; // New prop to control zero stock behavior
}

const ArticleSearch: React.FC<ArticleSearchProps> = ({
  onSelect,
  selectedArticle,
  required = false,
  disabled = false,
  allowZeroStock = false // Default to false for sales
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articleExists, setArticleExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchArticles();
    } else {
      setResults([]);
      setArticleExists(null);
    }
  }, [searchTerm]);

  const searchArticles = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: searchError } = await supabase
        .from('articles')
        .select('*')
        .or(`nom.ilike.%${searchTerm}%,cb.ilike.%${searchTerm}%,cb_ref.ilike.%${searchTerm}%`)
        .limit(10);

      if (searchError) throw searchError;

      setResults(data || []);
      setArticleExists(data && data.length > 0);
    } catch (err) {
      setError((err as Error).message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const canSelectArticle = (article: Article) => {
    return allowZeroStock || article.stock > 0;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Rechercher un article par code barre ou nom..."
          className={`input pl-10 w-full ${required && !selectedArticle ? 'border-red-300' : ''}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

        {results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
            <ul className="py-1 divide-y divide-gray-200">
              {results.map((article) => (
                <li
                  key={article.id}
                  className={`cursor-pointer hover:bg-gray-50 px-4 py-2 ${
                    !canSelectArticle(article) ? 'opacity-50 cursor-not-allowed bg-red-50' : ''
                  }`}
                  onClick={() => {
                    if (canSelectArticle(article)) {
                      onSelect(article);
                      setSearchTerm('');
                      setResults([]);
                    } else {
                      setError('Cet article est en rupture de stock');
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {article.cb} - {article.nom}
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-3 ${
                          article.stock > 10 ? 'bg-green-100 text-green-800' :
                          article.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Stock: {article.stock}
                        </span>
                        <span>Prix: {formatCurrency(article.prixd)}</span>
                      </div>
                    </div>
                    {!canSelectArticle(article) && (
                      <div className="flex items-center text-red-600">
                        <AlertCircle className="h-5 w-5 mr-1" />
                        <span className="text-xs font-medium">Rupture de stock</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {searchTerm.length >= 2 && !loading && articleExists === false && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Article non trouvé. Veuillez vérifier le code barre ou le nom.</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {selectedArticle && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">
                {selectedArticle.cb} - {selectedArticle.nom}
              </div>
              <div className="text-sm text-gray-600">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-3 ${
                  selectedArticle.stock > 10 ? 'bg-green-100 text-green-800' :
                  selectedArticle.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Stock: {selectedArticle.stock}
                </span>
                <span>Prix: {formatCurrency(selectedArticle.prixd)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelect({} as Article)}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Supprimer</span>
              ×
            </button>
          </div>
        </div>
      )}

      {required && !selectedArticle && (
        <p className="text-sm text-red-600 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Veuillez sélectionner un article
        </p>
      )}
    </div>
  );
};

export default ArticleSearch;