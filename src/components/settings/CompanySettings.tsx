import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Save, Upload } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface CompanyInfo {
  name: string;
  logo_url?: string;
  phone: string;
  email: string;
  website: string;
  address: string;
}

interface LegalInfo {
  capital: string;
  rc_number: string;
  nif_number: string;
  stat_number: string;
}

interface BankingInfo {
  bgfi_number: string;
  ugb_number: string;
}

interface Policies {
  return_policy: string;
}

const CompanySettings: React.FC = () => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    phone: '',
    email: '',
    website: '',
    address: ''
  });

  const [legalInfo, setLegalInfo] = useState<LegalInfo>({
    capital: '',
    rc_number: '',
    nif_number: '',
    stat_number: ''
  });

  const [bankingInfo, setBankingInfo] = useState<BankingInfo>({
    bgfi_number: '',
    ugb_number: ''
  });

  const [policies, setPolicies] = useState<Policies>({
    return_policy: ''
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .in('category', ['company'])
        .in('key', ['info', 'legal', 'banking', 'policies']);

      if (error) throw error;

      data?.forEach(setting => {
        switch (setting.key) {
          case 'info':
            setCompanyInfo(setting.value);
            if (setting.value.logo_url) {
              setImagePreview(setting.value.logo_url);
            }
            break;
          case 'legal':
            setLegalInfo(setting.value);
            break;
          case 'banking':
            setBankingInfo(setting.value);
            break;
          case 'policies':
            setPolicies(setting.value);
            break;
        }
      });
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Erreur lors du chargement des paramètres');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit être une image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 2MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      const timestamp = Date.now();
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `logo_${timestamp}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError, data } = await supabase.storage
        .from('company-logos')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100);
          },
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading logo:', err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      let logoUrl = companyInfo.logo_url;
      if (imageFile) {
        logoUrl = await uploadLogo();
      }

      const updates = [
        {
          category: 'company',
          key: 'info',
          value: { ...companyInfo, logo_url: logoUrl }
        },
        {
          category: 'company',
          key: 'legal',
          value: legalInfo
        },
        {
          category: 'company',
          key: 'banking',
          value: bankingInfo
        },
        {
          category: 'company',
          key: 'policies',
          value: policies
        }
      ];

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('settings')
          .upsert({
            ...update,
            updated_at: new Date().toISOString(),
            updated_by: (await supabase.auth.getUser()).data.user?.id
          }, {
            onConflict: 'category,key'
          });

        if (updateError) throw updateError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating settings:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
          <p className="text-sm text-green-700">
            Les paramètres ont été mis à jour avec succès
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="bg-cyan-500 text-white px-4 py-2 rounded-t-lg">
            Logo de l'Entreprise
          </div>
          <div className="p-4 border border-gray-200 rounded-b-lg">
            <div className="flex items-center justify-center">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Logo de l'entreprise"
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setCompanyInfo(prev => ({ ...prev, logo_url: undefined }));
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
                      Cliquez pour ajouter un logo
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
            Informations du Contact
          </div>
          <div className="p-4 border border-gray-200 rounded-b-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom Société
              </label>
              <input
                type="text"
                className="input"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telephone
              </label>
              <input
                type="text"
                className="input"
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="input"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site web
                </label>
                <input
                  type="text"
                  className="input"
                  value={companyInfo.website}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse
              </label>
              <textarea
                className="input min-h-[100px]"
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="bg-cyan-500 text-white px-4 py-2 rounded-t-lg">
            Informations Légales
          </div>
          <div className="p-4 border border-gray-200 rounded-b-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capital
                </label>
                <input
                  type="text"
                  className="input"
                  value={legalInfo.capital}
                  onChange={(e) => setLegalInfo({ ...legalInfo, capital: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Num RC
                </label>
                <input
                  type="text"
                  className="input"
                  value={legalInfo.rc_number}
                  onChange={(e) => setLegalInfo({ ...legalInfo, rc_number: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Num N.I.F
                </label>
                <input
                  type="text"
                  className="input"
                  value={legalInfo.nif_number}
                  onChange={(e) => setLegalInfo({ ...legalInfo, nif_number: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Num statistique
                </label>
                <input
                  type="text"
                  className="input"
                  value={legalInfo.stat_number}
                  onChange={(e) => setLegalInfo({ ...legalInfo, stat_number: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-cyan-500 text-white px-4 py-2 rounded-t-lg">
            Informations Bancaires
          </div>
          <div className="p-4 border border-gray-200 rounded-b-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Num B.G.F.I
                </label>
                <input
                  type="text"
                  className="input"
                  value={bankingInfo.bgfi_number}
                  onChange={(e) => setBankingInfo({ ...bankingInfo, bgfi_number: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Num U.G.B
                </label>
                <input
                  type="text"
                  className="input"
                  value={bankingInfo.ugb_number}
                  onChange={(e) => setBankingInfo({ ...bankingInfo, ugb_number: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-cyan-500 text-white px-4 py-2 rounded-t-lg">
            Politiques
          </div>
          <div className="p-4 border border-gray-200 rounded-b-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Politique de retour
              </label>
              <textarea
                className="input min-h-[100px]"
                value={policies.return_policy}
                onChange={(e) => setPolicies({ ...policies, return_policy: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="btn btn-secondary"
          >
            <X className="h-4 w-4 mr-2" />
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
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanySettings;