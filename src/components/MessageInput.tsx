// src/components/MessageInput.tsx
import React, { useState } from 'react';
import { Send, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface MessageInputProps {
  conversationId: string;
  senderId: string;
  productId?: string;
  productPrice?: number;
  onMessageSent?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  conversationId, senderId, productId, productPrice, onMessageSent 
}) => {
  const [message, setMessage] = useState('');
  const [showOfferOption, setShowOfferOption] = useState(false);
  const [offerAmount, setOfferAmount] = useState(productPrice || 0);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (content: string, type: string = 'text', amount?: number) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          message_type: type,
          offer_amount: amount,
          offer_status: type === 'offer' ? 'pending' : null,
          read: false
        });

      if (error) throw error;
      if (onMessageSent) onMessageSent();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
      setMessage('');
      setShowOfferOption(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessage(message);
  };

  const handleMakeOffer = () => {
    if (offerAmount <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    
    const content = `J'offre ${offerAmount}€ pour ce produit`;
    sendMessage(content, 'offer', offerAmount);
  };

  return (
    <div className="p-4 border-t">
      {showOfferOption && productPrice ? (
        <div className="mb-4 p-3 border rounded-lg">
          <h4 className="font-medium mb-2">Faire une offre</h4>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(Number(e.target.value))}
              className="flex-1 px-3 py-2 border rounded-lg"
              min="1"
              max={productPrice * 2}
            />
            <span>€</span>
          </div>
          <div className="flex justify-between">
            <button 
              className="text-gray-500"
              onClick={() => setShowOfferOption(false)}
            >
              Annuler
            </button>
            <button 
              className="bg-black text-white px-3 py-1 rounded-lg"
              onClick={handleMakeOffer}
              disabled={loading}
            >
              Envoyer l'offre
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          {productId && (
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 border rounded-full"
              onClick={() => setShowOfferOption(true)}
              title="Options"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
          
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
          
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Envoyer
          </button>
        </form>
      )}
    </div>
  );
};

export default MessageInput;