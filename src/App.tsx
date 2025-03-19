import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import ProductCard from './components/ProductCard';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import { supabase } from './lib/supabase';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string | null;
  images: string[];
  description: string;
  seller_id: string;
  user_id: string;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Produits de secours en cas d'erreur de chargement
  const fallbackProducts = [
    {
      id: "1",
      title: "Montre Vintage Cartier Tank",
      price: 12500,
      location: "Paris 8ème",
      image: "/api/placeholder/600/400",
      images: ["/api/placeholder/600/400"],
      description: "Authentique montre Cartier Tank en or, excellent état",
      seller_id: "seller1",
      user_id: "seller1"
    },
    {
      id: "2",
      title: "Sac Kelly Hermès",
      price: 18900,
      location: "Lyon",
      image: "/api/placeholder/600/400",
      images: ["/api/placeholder/600/400"],
      description: "Sac Kelly 28 en cuir Togo noir, état neuf",
      seller_id: "seller2",
      user_id: "seller2"
    },
    {
      id: "3",
      title: "Foulard en Soie Chanel",
      price: 450,
      location: "Bordeaux",
      image: "/api/placeholder/600/400",
      images: ["/api/placeholder/600/400"],
      description: "Foulard vintage en soie, motif camélia",
      seller_id: "seller3",
      user_id: "seller3"
    }
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Vérifier d'abord si la table produits existe
      const { error: tableCheckError } = await supabase
        .from('products')
        .select('id')
        .limit(1);
      
      if (tableCheckError) {
        console.warn("Table check error:", tableCheckError);
        throw new Error(tableCheckError.message);
      }
      
      // Tenter de charger les produits depuis Supabase
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) {
        console.error("Erreur Supabase:", error);
        throw new Error(error.message);
      } else if (data && data.length > 0) {
        console.log("Produits chargés:", data);
        
        // Mapper les produits pour assurer la compatibilité des champs
        const mappedProducts = data.map(product => ({
          ...product,
          // S'assurer que seller_id existe (si c'est user_id qui est utilisé)
          seller_id: product.seller_id || product.user_id,
          // S'assurer que image existe (si c'est images[] qui est utilisé)
          image: product.image || (product.images && product.images.length > 0 ? product.images[0] : null)
        }));
        
        setProducts(mappedProducts);
      } else {
        // Si on n'a pas de données, utiliser les produits de secours
        console.log("Aucun produit trouvé, utilisation des données de démonstration");
        setProducts(fallbackProducts);
        setError("Aucun produit actif n'a été trouvé. Voici des exemples.");
        toast("Aucun produit disponible. Données de démonstration affichées.");
      }
    } catch (err) {
      console.error("Erreur lors du chargement des produits:", err);
      setProducts(fallbackProducts);
      
      if (err instanceof Error) {
        if (err.message.includes("does not exist")) {
          setError("La table 'products' n'est pas encore disponible. Données de démonstration affichées.");
        } else {
          setError(`Erreur: ${err.message}`);
        }
      } else {
        setError("Erreur lors du chargement des produits");
      }
      
      toast.error("Erreur de chargement. Données de démonstration affichées.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Produits en Vedette</h2>
          
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-gray-600">Chargement des produits...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-6">
                  <p>Mode démonstration : {error}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product) => (
                  <ProductCard key={product.id} product={{
                    ...product,
                    // Assurer la compatibilité avec le composant ProductCard
                    image: product.image || (product.images && product.images.length > 0 
                      ? product.images[0] 
                      : "/api/placeholder/300/200")
                  }} />
                ))}
              </div>
            </>
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