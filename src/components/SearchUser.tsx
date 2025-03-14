// src/components/SearchUser.tsx
import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { findOrCreateConversation } from '../lib/messageService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface UserSearchProps {
  onClose?: () => void;
  productId?: string;
}

interface UserSearchResult {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const SearchUser: React.FC<UserSearchProps> = ({ onClose, productId }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Récupérer l'ID de l'utilisateur actuel
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchUsers = async (query: string) => {
    setLoading(true);
    try {
      console.log("Recherche pour:", query); // Log de débogage
      
      // Recherche plus permissive
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .or(`email.ilike.%${query}%,email.ilike.${query}%,full_name.ilike.%${query}%`)
        .limit(10);
      
      console.log("Résultats:", data); // Log de débogage
      
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Erreur de recherche:', error);
      toast.error('Erreur lors de la recherche d\'utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user: UserSearchResult) => {
    if (!currentUserId) {
      toast.error('Vous devez être connecté pour envoyer un message');
      return;
    }

    try {
      setLoading(true);
      
      if (!productId) {
        // Si pas de productId spécifié, créer une conversation générale
        const { error } = await findOrCreateConversation(
          'general', // Utiliser un ID de produit générique
          currentUserId,
          user.id
        );

        if (error) throw error;
        
        // Rediriger vers la page de messages
        navigate('/messages');
        toast.success(`Conversation initiée avec ${user.full_name || user.email}`);
      } else {
        // Avec un productId, créer une conversation pour ce produit
        const { error } = await findOrCreateConversation(
          productId,
          currentUserId,
          user.id
        );

        if (error) throw error;
        
        // Si onClose est fourni, fermer le modal
        if (onClose) {
          onClose();
        }
        
        toast.success(`Message à ${user.full_name || user.email} disponible dans vos messages`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la création de la conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Rechercher un utilisateur</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par email ou nom..."
          className="w-full px-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          autoFocus
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-4">Recherche en cours...</div>
      ) : searchQuery.length < 3 ? (
        <div className="text-center py-4 text-gray-500">
          Saisissez au moins 3 caractères pour rechercher
        </div>
      ) : searchResults.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          Aucun utilisateur trouvé pour "{searchQuery}"
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto">
          {searchResults.map((user) => (
            <div
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
            >
              <img
                src={user.avatar_url || 'https://via.placeholder.com/40'}
                alt={user.full_name || 'Utilisateur'}
                className="h-10 w-10 rounded-full mr-3"
              />
              <div>
                <p className="font-medium">{user.full_name || 'Utilisateur sans nom'}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchUser;