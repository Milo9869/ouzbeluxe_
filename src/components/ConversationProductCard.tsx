// src/components/ConversationProductCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ConversationProductCardProps {
  product: {
    id: string;
    title: string;
    price: number;
    image_url: string;
  };
}

const ConversationProductCard: React.FC<ConversationProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  
  return (
    <div className="border rounded-lg overflow-hidden mb-4">
      <div className="flex">
        <div className="w-24 h-24 flex-shrink-0">
          <img 
            src={product.image_url || 'https://via.placeholder.com/96'} 
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-3 flex-1">
          <h4 className="font-medium text-sm truncate">{product.title}</h4>
          <p className="text-lg font-bold">{product.price.toLocaleString()}€</p>
          <button 
            onClick={() => navigate(`/product/${product.id}`)}
            className="text-xs text-gray-600 underline"
          >
            Voir le produit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationProductCard;