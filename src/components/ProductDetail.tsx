// src/components/ProductDetail.tsx
import React, { useState } from 'react';
import { MessageSquare, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { findOrCreateConversation } from '../lib/messageService';
import toast from 'react-hot-toast';

interface ProductDetailProps {
  product: {
    id: string;
    title: string;
    price: number;
    description: string;
    image_url: string;
    seller_id: string;
  };
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const handleContactSeller = async () => {
    if (!user) {
      toast.error("Veuillez vous connecter pour contacter le vendeur");
      return;
    }
    
    if (user.id === product.seller_id) {
      toast.error("Vous ne pouvez pas contacter votre propre annonce");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await findOrCreateConversation(
        product.id,
        user.id,
        product.seller_id
      );
      
      if (error) throw error;
      
      // Rediriger vers la conversation
      navigate('/messages');
      
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Une erreur est survenue lors de la création de la conversation");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/2">
          <img 
            src={product.image_url || 'https://via.placeholder.com/500'} 
            alt={product.title}
            className="w-full h-auto rounded-lg"
          />
        </div>
        
        <div className="md:w-1/2">
          <h1 className="text-2xl font-serif font-bold mb-2">{product.title}</h1>
          <p className="text-3xl font-bold mb-4">{product.price.toLocaleString()}€</p>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-gray-700">{product.description}</p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handleContactSeller}
              disabled={loading || !user || user.id === product.seller_id}
              className="flex-1 bg-black text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <MessageSquare className="h-5 w-5" />
              Contacter le vendeur
            </button>
            
            <button className="p-3 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
              <Heart className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;