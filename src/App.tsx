import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import ProductCard from './components/ProductCard';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import { supabase } from './lib/supabase';

interface Product {
  id: number;
  title: string;
  price: number;
  location: string;
  image: string;
  description: string;
  seller_id: string;
}

function App() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6);
        
      if (error) {
        console.error("Erreur Supabase:", error);
        throw error;
      }
      
      console.log("Produits récupérés:", data);
    
      if (data && data.length > 0) {
        const formattedProducts = data.map(product => ({
          id: product.id,
          title: product.title || 'Sans titre',
          price: product.price || 0,
          location: product.location || 'Non spécifié',
          image: product.images?.[0] || 'https://via.placeholder.com/600x400?text=Produit',
          description: product.description || '',
          seller_id: product.user_id
        }));
        
        setFeaturedProducts(formattedProducts);
      } else {
        setFeaturedProducts([
          {
            id: 1,
            title: "Montre Vintage Cartier Tank",
            price: 12500,
            location: "Paris 8ème",
            image: "https://images.unsplash.com/photo-1526045431048-f857369baa09?auto=format&fit=crop&q=80&w=600",
            description: "Authentique montre Cartier Tank en or, excellent état",
            seller_id: "seller1"
          },
          {
            id: 2,
            title: "Sac Kelly Hermès",
            price: 18900,
            location: "Lyon",
            image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=600",
            description: "Sac Kelly 28 en cuir Togo noir, état neuf",
            seller_id: "seller2"
          },
          {
            id: 3,
            title: "Foulard en Soie Chanel",
            price: 450,
            location: "Bordeaux",
            image: "https://images.unsplash.com/photo-1584030373081-f37b019b2445?auto=format&fit=crop&q=80&w=600",
            description: "Foulard vintage en soie, motif camélia",
            seller_id: "seller3"
          }
        ]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Produits en Vedette</h2>
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des produits...</p>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-600">Aucun produit disponible pour le moment</p>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Le Marché Luxe</h3>
              <p className="text-gray-400">Votre destination pour le luxe français authentique.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Liens Utiles</h3>
              <ul className="space-y-2 text-gray-400">
                <li>À Propos</li>
                <li>Comment Ça Marche</li>
                <li>Conditions d'Utilisation</li>
                <li>Politique de Confidentialité</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>support@marcheluxe.fr</li>
                <li>+33 1 23 45 67 89</li>
                <li>Paris, France</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      <Toaster position="top-center" />
    </div>
  );
}

export default App;