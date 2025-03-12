import React, { useState } from 'react';
import { X, Upload, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ProductForm {
  category: string;
  subcategory: string;
  brand: string;
  customBrand: string;
  model: string;
  condition: string;
  description: string;
  price: number;
  location: string;
  negotiable: boolean;
  images: File[];
  status: 'draft' | 'published';
}

const categories = {
  'Sacs': ['Sac à main', 'Sac à bandoulière', 'Sac à dos', 'Sac de voyage'],
  'Chaussures': ['Bottines', 'Escarpins', 'Baskets', 'Sandales'],
  'Vêtements': ['Robes', 'Manteaux', 'Costumes', 'Accessoires vestimentaires'],
  'Accessoires': ['Foulards', 'Ceintures', 'Gants', 'Parapluies'],
  'Montres': ['Montres mécaniques', 'Montres quartz', 'Montres vintage'],
  'Bijoux': ['Colliers', 'Bracelets', 'Bagues', 'Boucles d\'oreilles']
};

const brands = [
  'Hermès', 'Louis Vuitton', 'Chanel', 'Dior', 'Gucci', 'Prada', 
  'Cartier', 'Rolex', 'Van Cleef & Arpels', 'Bulgari', 'Autre'
];

const conditions = [
  { value: 'new_with_tags', label: 'Neuf avec étiquette', description: 'Jamais porté, avec étiquettes d\'origine' },
  { value: 'new_without_tags', label: 'Neuf sans étiquette', description: 'Jamais porté, sans étiquettes' },
  { value: 'excellent', label: 'Excellent état', description: 'Comme neuf, très légères traces d\'utilisation' },
  { value: 'very_good', label: 'Très bon état', description: 'Quelques légères traces d\'utilisation' },
  { value: 'good', label: 'Bon état', description: 'Signes d\'utilisation normaux' },
  { value: 'fair', label: 'État correct', description: 'Signes d\'utilisation visibles mais fonctionnel' }
];

const CreateProduct: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductForm>({
    category: '',
    subcategory: '',
    brand: '',
    customBrand: '',
    model: '',
    condition: '',
    description: '',
    price: 0,
    location: '',
    negotiable: false,
    images: [],
    status: 'draft'
  });

  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + form.images.length > 8) {
      toast.error('Maximum 8 images autorisées');
      return;
    }
    
    setForm(prev => ({ ...prev, images: [...prev.images, ...files] }));
    
    // Créer des prévisualisations
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour créer une annonce');
        return;
      }

      // Upload des images
      const imageUrls = await Promise.all(
        form.images.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Math.random()}.${fileExt}`;
          const filePath = `products/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);

          return publicUrl;
        })
      );

      // Créer l'annonce
      const { error } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          category: form.category,
          subcategory: form.subcategory,
          brand: form.brand === 'Autre' ? form.customBrand : form.brand,
          model: form.model,
          condition: form.condition,
          description: form.description,
          price: form.price,
          location: form.location,
          negotiable: form.negotiable,
          images: imageUrls,
          status: form.status
        });

      if (error) throw error;

      toast.success('Annonce créée avec succès');
      // Rediriger vers la page d'accueil
      navigate('/');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Erreur lors de la création de l'annonce: ${error.message}`);
      } else {
        toast.error('Erreur lors de la création de l\'annonce');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour à l'accueil
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-serif font-bold mb-8">Créer une nouvelle annonce</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie *
              </label>
              <select
                value={form.category}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, category: e.target.value, subcategory: '' }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              >
                <option value="">Sélectionnez une catégorie</option>
                {Object.keys(categories).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Sous-catégorie */}
            {form.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sous-catégorie *
                </label>
                <select
                  value={form.subcategory}
                  onChange={(e) => setForm(prev => ({ ...prev, subcategory: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                >
                  <option value="">Sélectionnez une sous-catégorie</option>
                  {categories[form.category as keyof typeof categories].map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Marque */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marque *
              </label>
              <select
                value={form.brand}
                onChange={(e) => setForm(prev => ({ ...prev, brand: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              >
                <option value="">Sélectionnez une marque</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Marque personnalisée */}
            {form.brand === 'Autre' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la marque
                </label>
                <input
                  type="text"
                  value={form.customBrand}
                  onChange={(e) => setForm(prev => ({ ...prev, customBrand: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>
            )}

            {/* Modèle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modèle *
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>

            {/* État */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                État *
              </label>
              <select
                value={form.condition}
                onChange={(e) => setForm(prev => ({ ...prev, condition: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              >
                <option value="">Sélectionnez l'état</option>
                {conditions.map((condition) => (
                  <option key={condition.value} value={condition.value}>
                    {condition.label}
                  </option>
                ))}
              </select>
              {form.condition && (
                <p className="mt-1 text-sm text-gray-500">
                  {conditions.find(c => c.value === form.condition)?.description}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description détaillée *
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>

            {/* Prix */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix (UZS) *
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
              {form.price > 0 && (
                <div className="mt-1 text-sm text-gray-500">
                  <p>USD: {(form.price * 0.00008).toFixed(2)}</p>
                  <p>EUR: {(form.price * 0.000074).toFixed(2)}</p>
                </div>
              )}
            </div>

            {/* Localisation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ville *
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>

            {/* Négociable */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="negotiable"
                checked={form.negotiable}
                onChange={(e) => setForm(prev => ({ ...prev, negotiable: e.target.checked }))}
                className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
              />
              <label htmlFor="negotiable" className="ml-2 block text-sm text-gray-700">
                Prix négociable
              </label>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photos (3-8 photos) *
              </label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                {previewImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {previewImages.length < 8 && (
                  <label className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <Upload className="h-8 w-8 text-gray-400" />
                  </label>
                )}
              </div>
              {form.images.length < 3 && (
                <p className="mt-1 text-sm text-red-500">
                  Minimum 3 photos requises
                </p>
              )}
            </div>

            {/* Boutons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting || form.images.length < 3}
                className="flex-1 bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Publication...' : 'Publier l\'annonce'}
              </button>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, status: 'draft' }))}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Enregistrer comme brouillon
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProduct; 