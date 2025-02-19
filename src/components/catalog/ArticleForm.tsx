import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Package, Plus, Trash2, Upload, Image } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface ArticleFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface Reference {
  code: string;
  description?: string;
}

const ArticleForm: React.FC<ArticleFormProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    cb: '',
    cb_ref: '',
    nom: '',
    prixa: '',
    transport_cost: '',
    prixg: '',
    prixd: '',
    last_sale_price: '',
    type_stock: 'O',
    emplacement: '',
    obs: '',
    stock: '0',
    categorie_article_id: '',
    marque_id: '',
    avatar: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [references, setReferences] = useState<Reference[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
    loadBrands();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (err) {
      console.error('Error loading brands:', err);
    }
  };

  const calculateTotalCost = () => {
    const purchasePrice = parseFloat(formData.prixa) || 0;
    const transportCost = parseFloat(formData.transport_cost) || 0;
    return purchasePrice + transportCost;
  };

  const addReference = () => {
    setReferences([...references, { code: '' }]);
  };

  const updateReference = (index: number, code: string, description?: string) => {
    const newRefs = [...references];
    newRefs[index] = { code, description };
    setReferences(newRefs);
  };

  const removeReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit être une image');
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 2MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (articleId: string): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${articleId}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('article-images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100);
          },
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cb || !formData.nom) {
      setError('Le code barre et le nom sont requis');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First create the article
      const { data: article, error: createError } = await supabase
        .from('articles')
        .insert([{
          cb: formData.cb,
          cb_ref: formData.cb_ref || null,
          nom: formData.nom,
          prixa: parseFloat(formData.prixa) || 0,
          transport_cost: parseFloat(formData.transport_cost) || 0,
          prixg: parseFloat(formData.prixg) || 0,
          prixd: parseFloat(formData.prixd) || 0,
          last_sale_price: parseFloat(formData.last_sale_price) || 0,
          type_stock: formData.type_stock,
          emplacement: formData.emplacement || null,
          obs: formData.obs || null,
          stock: parseInt(formData.stock) || 0,
          categorie_article_id: formData.categorie_article_id || null,
          marque_id: formData.marque_id || null,
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Upload image if selected
      if (imageFile && article) {
        const imageUrl = await uploadImage(article.id);
        if (imageUrl) {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ avatar: imageUrl })
            .eq('id', article.id);

          if (updateError) throw updateError;
        }
      }

      // Create references if any
      if (references.length > 0) {
        const { error: refsError } = await supabase
          .from('article_references')
          .insert(
            references.map(ref => ({
              article_id: article.id,
              code: ref.code,
              description: ref.description
            }))
          );

        if (refsError) throw refsError;
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Nouvel Article</h2>
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

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <div className="bg-cyan-500 text-white px-4 py-2 rounded-t-lg">
                Photo de l'Article
              </div>
              <div className="p-4 border border-gray-200 rounded-b-lg">
                <div className="flex items-center justify-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Aperçu"
                        className="w-48 h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-48 h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">
                          Cliquez pour ajouter une photo
                        </p>
                        <p className="text-xs text-gray-400">
                          PNG, JPG jusqu'à 2MB
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-primary-600 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="bg-cyan-500 text-white px-4 py-2 rounded-t-lg">
                Informations de base
              </div>
              <div className="p-4 border border-gray-200 rounded-b-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code Barre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.cb}
                      onChange={(e) => setFormData({ ...formData, cb: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code Référence Principal
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.cb_ref}
                      onChange={(e) => setFormData({ ...formData, cb_ref: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Codes Référence Additionnels
                    </label>
                    <button
                      type="button"
                      onClick={addReference}
                      className="btn btn-secondary text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter une référence
                    </button>
                  </div>
                  <div className="space-y-2">
                    {references.map((ref, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          className="input flex-1"
                          value={ref.code}
                          onChange={(e) => updateReference(index, e.target.value, ref.description)}
                          placeholder="Code de référence"
                        />
                        <input
                          type="text"
                          className="input flex-1"
                          value={ref.description || ''}
                          onChange={(e) => updateReference(index, ref.code, e.target.value)}
                          placeholder="Description (optionnel)"
                        />
                        <button
                          type="button"
                          onClick={() => removeReference(index)}
                          className="btn btn-secondary p-2"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catégorie
                    </label>
                    <select
                      className="input"
                      value={formData.categorie_article_id}
                      onChange={(e) => setFormData({ ...formData, categorie_article_id: e.target.value })}
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marque
                    </label>
                    <select
                      className="input"
                      value={formData.marque_id}
                      onChange={(e) => setFormData({ ...formData, marque_id: e.target.value })}
                    >
                      <option value="">Sélectionner une marque</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-cyan-500 text-white px-4 py-2 rounded-t-lg">
                Prix et Coûts
              </div>
              <div className="p-4 border border-gray-200 rounded-b-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix d'Achat
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.prixa}
                      onChange={(e) => setFormData({ ...formData, prixa: e.target.value })}
                      min="0"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frais de Transport
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.transport_cost}
                      onChange={(e) => setFormData({ ...formData, transport_cost: e.target.value })}
                      min="0"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix de Revient Total
                    </label>
                    <input
                      type="number"
                      className="input bg-gray-50"
                      value={calculateTotalCost()}
                      readOnly
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Prix d'achat + Frais de transport
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix de Gros
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.prixg}
                      onChange={(e) => setFormData({ ...formData, prixg: e.target.value })}
                      min="0"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix de Vente
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.prixd}
                      onChange={(e) => setFormData({ ...formData, prixd: e.target.value })}
                      min="0"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dernier Prix de Vente
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.last_sale_price}
                      onChange={(e) => setFormData({ ...formData, last_sale_price: e.target.value })}
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-cyan-500 text-white px-4 py-2 rounded-t-lg">
                Stock et Emplacement
              </div>
              <div className="p-4 border border-gray-200 rounded-b-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type de Stock
                    </label>
                    <select
                      className="input"
                      value={formData.type_stock}
                      onChange={(e) => setFormData({ ...formData, type_stock: e.target.value })}
                    >
                      <option value="O">Original</option>
                      <option value="N">Non Original</option>
                      <option value="S">Service</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emplacement
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.emplacement}
                      onChange={(e) => setFormData({ ...formData, emplacement: e.target.value })}
                      placeholder="Ex: A1-B2-C3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Initial
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observations
              </label>
              <textarea
                className="input min-h-[100px]"
                value={formData.obs}
                onChange={(e) => setFormData({ ...formData, obs: e.target.value })}
                placeholder="Notes ou observations sur l'article..."
              />
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

export default ArticleForm;