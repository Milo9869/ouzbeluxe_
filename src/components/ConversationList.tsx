import React, { useState, useEffect, useRef } from 'react';
import { getUserConversations, ConversationSummary } from '../lib/messageService';
import { supabase } from '../lib/supabase';
import { MessageCircle } from 'lucide-react';

interface ConversationListProps {
  onSelectConversation: (conversation: ConversationSummary) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadConversations();
    setupRealtimeSubscription();
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const setupRealtimeSubscription = () => {
    // Nettoyer l'ancien canal si existant
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    
    try {
      // Créer un canal pour surveiller les changements dans les tables messages et conversations
      const channel = supabase
        .channel('conversation-list-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'messages' }, 
          () => {
            // Recharger les conversations quand il y a de nouveaux messages
            loadConversations();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'conversations' },
          () => {
            // Recharger quand une conversation est créée ou mise à jour
            loadConversations();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Abonné avec succès aux changements de conversations');
          } else {
            console.log('Statut d\'abonnement:', status);
          }
        });
        
      channelRef.current = channel;
    } catch (err) {
      console.error("Erreur lors de la configuration du canal realtime:", err);
      setError("Impossible de configurer les notifications en temps réel");
    }
  };

  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Erreur auth:", authError);
        setError("Erreur d'authentification");
        return;
      }
      
      if (!user) {
        console.log("Aucun utilisateur connecté");
        setConversations([]);
        return;
      }

      console.log("Chargement des conversations pour l'utilisateur:", user.id);
      const { data, error: convError } = await getUserConversations(user.id);
      
      if (convError) {
        console.error("Erreur conversations:", convError);
        setError("Erreur lors du chargement des conversations");
        throw convError;
      }
      
      if (data) {
        // Trier les conversations par date du dernier message
        const sortedConversations = data.sort((a: ConversationSummary, b: ConversationSummary) => {
          const dateA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
          const dateB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
          return dateB - dateA; // Ordre décroissant
        });
        
        console.log(`${sortedConversations.length} conversations chargées et triées`);
        setConversations(sortedConversations);
      } else {
        // Si data est null, initialiser avec un tableau vide
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Ne pas remplacer une erreur spécifique par une erreur générique
      if (!error) {
        setError('Erreur lors du chargement des conversations');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversation: ConversationSummary) => {
    setSelectedId(conversation.id);
    onSelectConversation(conversation);
  };

  if (loading) {
    return <div className="p-4 text-center">Chargement...</div>;
  }
  
  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>{error}</p>
        <button 
          onClick={loadConversations}
          className="mt-2 text-sm text-blue-500 hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <MessageCircle className="mx-auto h-10 w-10 text-gray-400 mb-2" />
        <p>Aucune conversation</p>
        <p className="text-sm mt-1">Vos messages apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          onClick={() => handleSelectConversation(conversation)}
          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
            selectedId === conversation.id ? 'bg-gray-100' : ''
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {conversation.other_user.avatar_url ? (
                <img
                  src={conversation.other_user.avatar_url}
                  alt={conversation.other_user.full_name || 'User'}
                  className="h-10 w-10 rounded-full"
                  onError={(e) => {
                    // Remplacer l'élément img par un div avec les initiales
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentNode;
                    if (parent) {
                      // Créer un élément div pour l'avatar par défaut
                      const div = document.createElement('div');
                      div.className = "h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600";
                      div.innerHTML = (conversation.other_user.full_name || conversation.other_user.email || 'U').charAt(0).toUpperCase();
                      
                      // Remplacer l'image par le div
                      parent.replaceChild(div, target);
                    }
                  }}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                  {(conversation.other_user.full_name || conversation.other_user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {conversation.other_user.full_name || conversation.other_user.email || 'Utilisateur'}
                </p>
                {conversation.last_message && (
                  <p className="text-xs text-gray-500">
                    {new Date(conversation.last_message.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-500 truncate">
                {conversation.last_message ? (
                  <>
                    {conversation.last_message.sender_id === conversation.other_user.id 
                      ? '' 
                      : 'Vous: '}
                    {conversation.last_message.content}
                  </>
                ) : (
                  'Nouvelle conversation'
                )}
              </p>
              {conversation.unread_count > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-black text-white mt-1">
                  {conversation.unread_count} non lu{conversation.unread_count > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};