import React, { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { MessageModal } from './MessageModal';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  title: string;
  price: number;
  location: string;
  image: string;
  description: string;
  seller_id: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  const handleMessageClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Veuillez vous connecter pour envoyer un message");
      return;
    }
    if (user.id === product.seller_id) {
      toast.error("Vous ne pouvez pas vous envoyer un message");
      return;
    }
    setIsMessageModalOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="relative">
          <img 
            src={product.image} 
            alt={product.title}
            className="w-full h-64 object-cover"
          />
          <button className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-100">
            <Heart className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.title}</h3>
          <p className="text-2xl font-bold text-gray-900 mb-2">{product.price.toLocaleString('fr-FR')} €</p>
          <p className="text-gray-600 mb-4">{product.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{product.location}</span>
            <div className="flex gap-2">
              <button
                onClick={handleMessageClick}
                className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                Message
              </button>
              <button className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                Voir détails
              </button>
            </div>
          </div>
        </div>
      </div>

      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        productId={product.id.toString()}
        sellerId={product.seller_id}
      />
    </>
  );
};

export default ProductCard;