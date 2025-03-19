// src/components/ConversationHeader.tsx
import React from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/ui/dropdown-menu';

interface ConversationHeaderProps {
  otherUser: {
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
  productTitle?: string;
  onBackClick: () => void;
  onDeleteConversation: () => void;
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({ 
  otherUser, productTitle, onBackClick, onDeleteConversation
}) => {
  return (
    <div className="p-4 border-b flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBackClick}
          className="md:hidden text-gray-500"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <img
          src={otherUser.avatar_url || 'https://via.placeholder.com/40'}
          alt={otherUser.full_name || 'User'}
          className="h-8 w-8 rounded-full"
        />
        
        <div>
          <h3 className="font-medium">
            {otherUser.full_name || otherUser.email || 'Utilisateur'}
          </h3>
          {productTitle && (
            <p className="text-xs text-gray-500">À propos de: {productTitle}</p>
          )}
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger className="text-gray-500">
          <MoreVertical className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onDeleteConversation} className="text-red-500">
            Supprimer la conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ConversationHeader;