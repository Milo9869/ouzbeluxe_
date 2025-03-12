import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Edit, Trash2, Pause, CheckCircle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

interface Product {
  id: number;
  title: string;
  price: number;
  status: 'active' | 'draft' | 'sold' | 'paused';
  images: string[];
  created_at: string;
  category: string;
  brand: string;
  model: string;
}

type TabType = 'active' | 'draft' | 'sold' | 'paused';

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser();
    fetchProducts();
  }, [activeTab]);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUser({ ...user, ...profile });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', activeTab)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erreur lors du chargement des annonces');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (productId: number, newStatus: Product['status']) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Statut de l\'annonce mis à jour');
      fetchProducts();
    } catch (error) {
      console.error('Error updating product status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDelete = async (productId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('Annonce supprimée');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const tabs = [
    { id: 'active', label: 'Annonces actives' },
    { id: 'draft', label: 'Brouillons' },
    { id: 'paused', label: 'En pause' },
    { id: 'sold', label: 'Vendues' }
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête du profil */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center space-x-6">
            <img
              src={user?.avatar_url || 'https://via.placeholder.com/96'}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover"
            />
            <div>
              <h1 className="text-2xl font-serif font-bold text-gray-900">
                {user?.full_name || user?.email}
              </h1>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Liste des annonces */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="relative">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                  >
                    <Eye className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => navigate(`/edit-product/${product.id}`)}
                    className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                  >
                    <Edit className="h-5 w-5 text-gray-600" />
                  </button>
                  {activeTab !== 'sold' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(product.id, 'paused')}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                      >
                        <Pause className="h-5 w-5 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleStatusChange(product.id, 'sold')}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                      >
                        <Trash2 className="h-5 w-5 text-red-600" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.title}</h3>
                <p className="text-gray-600 mb-2">{product.brand} - {product.model}</p>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  {product.price.toLocaleString('fr-FR')} UZS
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(product.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune annonce dans cette catégorie</p>
            {activeTab === 'active' && (
              <button
                onClick={() => navigate('/create-product')}
                className="mt-4 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Créer une nouvelle annonce
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 