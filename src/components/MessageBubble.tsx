// src/components/MessageBubble.tsx
import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface MessageBubbleProps {
  message: {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    read: boolean;
    message_type?: string;
    offer_amount?: number;
    offer_status?: string;
  };
  isCurrentUser: boolean;
  onAcceptOffer?: () => void;
  onDeclineOffer?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, isCurrentUser, onAcceptOffer, onDeclineOffer 
}) => {
  const isOffer = message.message_type === 'offer';
  
  const renderOfferStatus = () => {
    if (!isOffer) return null;
    
    switch (message.offer_status) {
      case 'accepted':
        return (
          <div className="flex items-center gap-1 text-green-500 mt-1">
            <CheckCircle className="h-3 w-3" />
            <span className="text-xs">Offre acceptée</span>
          </div>
        );
      case 'declined':
        return (
          <div className="flex items-center gap-1 text-red-500 mt-1">
            <XCircle className="h-3 w-3" />
            <span className="text-xs">Offre déclinée</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-gray-500 mt-1">
            <Clock className="h-3 w-3" />
            <span className="text-xs">En attente</span>
          </div>
        );
    }
  };
  
  const renderOfferActions = () => {
    if (!isOffer || isCurrentUser || message.offer_status !== 'pending') return null;
    
    return (
      <div className="flex gap-2 mt-2">
        <button 
          onClick={onDeclineOffer}
          className="px-2 py-1 border border-red-500 text-red-500 rounded text-xs"
        >
          Décliner
        </button>
        <button 
          onClick={onAcceptOffer}
          className="px-2 py-1 bg-green-500 text-white rounded text-xs"
        >
          Accepter
        </button>
      </div>
    );
  };
  
  return (
    <div
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div
        className={`max-w-[75%] rounded-lg p-3 ${
          isCurrentUser
            ? isOffer ? 'bg-black text-white' : 'bg-red-600 text-white'
            : isOffer ? 'bg-black text-white' : 'bg-red-100'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        
        {renderOfferStatus()}
        {renderOfferActions()}
        
        <div className="flex items-center gap-1 mt-1">
          <p className="text-xs opacity-70">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit', 
              minute:'2-digit'
            })}
          </p>
          {isCurrentUser && (
            <span className="text-xs opacity-70">
              {message.read ? ' • Vu' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;