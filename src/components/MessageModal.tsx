// src/components/MessageModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  sellerId: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
}

interface User {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, productId, sellerId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sellerInfo, setSellerInfo] = useState<{ email: string; full_name?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Charger l'utilisateur actuel
  useEffect(() => {
    async function loadCurrentUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
      }
    }
    
    if (isOpen) {
      loadCurrentUser();
    }
  }, [isOpen]);
  
  // Charger les informations du vendeur
  useEffect(() => {
    async function loadSellerInfo() {
      if (!sellerId) return;
      
      // Récupérer l'email du profil vendeur
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', sellerId)
        .single();
        
      if (userError || !userData) {
        console.error("Erreur lors de la récupération des infos vendeur:", userError);
        return;
      }
      
      setSellerInfo(userData);
    }
    
    if (isOpen && sellerId) {
      loadSellerInfo();
    }
  }, [isOpen, sellerId]);

  // Initialiser la conversation quand la modal s'ouvre
  useEffect(() => {
    if (isOpen && currentUser) {
      initializeConversation();
    }
  }, [isOpen, productId, sellerId, currentUser]);

  // S'abonner aux nouveaux messages
  useEffect(() => {
    if (!conversationId) return;
    
    // Créer un canal Supabase pour les messages en temps réel
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(current => [...current, newMessage]);
        
        // Marquer les messages de l'autre personne comme lus
        if (newMessage.sender_id !== currentUser?.id) {
          markMessageAsRead(newMessage.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUser]);

  // Défiler jusqu'au dernier message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = async () => {
    try {
      if (!currentUser) {
        toast.error("Vous devez être connecté pour envoyer des messages");
        return;
      }

      // Rechercher une conversation existante entre ces utilisateurs pour ce produit
      const { data: existingConversations, error: convError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(
            id,
            product_id
          )
        `)
        .eq('user_id', currentUser.id)
        .eq('conversations.product_id', productId);

      if (convError) {
        console.error("Erreur lors de la recherche de conversation:", convError);
        throw convError;
      }

      let foundConversationId: string | null = null;

      // Vérifier si l'une des conversations inclut le vendeur
      if (existingConversations && existingConversations.length > 0) {
        for (const conv of existingConversations) {
          const { data: participants, error: partError } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id)
            .eq('user_id', sellerId);

          if (!partError && participants && participants.length > 0) {
            // Conversation trouvée avec le vendeur
            foundConversationId = conv.conversation_id;
            break;
          }
        }
      }

      if (foundConversationId) {
        // Utiliser la conversation existante
        setConversationId(foundConversationId);
        await loadMessages(foundConversationId);
      } else {
        // Créer une nouvelle conversation
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({ product_id: productId })
          .select()
          .single();

        if (createError) throw createError;

        // Ajouter les deux participants
        const participantsPromises = [
          supabase
            .from('conversation_participants')
            .insert({ conversation_id: newConversation.id, user_id: currentUser.id }),
          supabase
            .from('conversation_participants')
            .insert({ conversation_id: newConversation.id, user_id: sellerId })
        ];

        const results = await Promise.all(participantsPromises);
        
        if (results[0].error || results[1].error) {
          console.error("Erreur ajout participants:", results[0].error || results[1].error);
          throw results[0].error || results[1].error;
        }

        setConversationId(newConversation.id);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.error("Une erreur inattendue s'est produite");
      }
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages(data || []);
      
      // Marquer tous les messages non lus comme lus
      if (data && data.length > 0 && currentUser) {
        const unreadMessages = data.filter(
          msg => !msg.read && msg.sender_id !== currentUser.id
        );
        
        for (const msg of unreadMessages) {
          await markMessageAsRead(msg.id);
        }
      }
    } catch (error) {
      console.error("Erreur chargement messages:", error);
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.error("Erreur lors du chargement des messages");
      }
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error("Erreur marquage message comme lu:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !currentUser) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: newMessage.trim(),
          read: false
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error("Erreur envoi message:", error);
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.error("Erreur lors de l'envoi du message");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full h-[600px] max-h-[90vh] relative flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-serif font-bold mb-2">Messages</h2>
        {sellerInfo && (
          <p className="text-gray-500 mb-6">
            Conversation avec {sellerInfo.full_name || sellerInfo.email}
          </p>
        )}

        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-2">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              Aucun message. Démarrez la conversation !
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender_id === currentUser?.id
                      ? 'bg-black text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  <p>{message.content}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-xs opacity-70">
                      {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    {message.sender_id === currentUser?.id && (
                      <span className="text-xs opacity-70">
                        {message.read ? ' • Vu' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            disabled={!currentUser}
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim() || !currentUser}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="h-5 w-5" />
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
};