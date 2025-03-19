import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import Navbar from './Navbar';
import { ConversationList } from './ConversationList';
import SearchUser from './SearchUser';
import { Send, ArrowLeft, MessageCircle, Search, PlusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  getConversationMessages, 
  sendMessage, 
  markAllMessagesAsRead,
  ConversationSummary
} from '../lib/messageService';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setCurrentUser(user);
    };
    
    checkUser();
    
    // Nettoyage des abonnements à la déconnexion
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [navigate]);

  // Charger les messages de la conversation sélectionnée
  useEffect(() => {
    if (selectedConversation && currentUser) {
      // Nettoyer l'abonnement précédent s'il existe
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      // Charger les messages
      loadMessages(selectedConversation.id);
      setIsMobileListVisible(false);
      
      // Marquer tous les messages comme lus
      markAllMessagesAsRead(selectedConversation.id, currentUser.id);
      
      // Configurer un nouvel abonnement pour cette conversation
      const channel = supabase
        .channel(`messages:${selectedConversation.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        }, (payload) => {
          const newMessage = payload.new as Message;
          
          // Utiliser un callback fonctionnel pour s'assurer d'avoir l'état le plus récent
          setMessages(currentMessages => {
            // Vérifier si le message existe déjà pour éviter les doublons
            if (!currentMessages.some(msg => msg.id === newMessage.id)) {
              return [...currentMessages, newMessage];
            }
            return currentMessages;
          });
          
          // Marquer le message comme lu s'il vient de l'autre personne
          if (currentUser && newMessage.sender_id !== currentUser.id) {
            markAllMessagesAsRead(selectedConversation.id, currentUser.id);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Abonné avec succès au canal messages:${selectedConversation.id}`);
          }
        });
      
      // Stocker la référence du canal pour le nettoyage
      channelRef.current = channel;
    }
    
    return () => {
      if (channelRef.current && !selectedConversation) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedConversation, currentUser]);

  // Défiler jusqu'au dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      console.log("Chargement des messages pour la conversation:", conversationId);
      const { data, error } = await getConversationMessages(conversationId);
      if (error) throw error;
      console.log(`${data?.length || 0} messages chargés`);
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !currentUser) return;

    try {
      setLoading(true);
      const messageContent = newMessage.trim();
      setNewMessage(''); // Vider l'input immédiatement
      
      const { error } = await sendMessage(
        selectedConversation.id,
        currentUser.id,
        messageContent
      );
      
      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Regrouper les messages par date
  const groupedMessages = messages.reduce((groups: Record<string, Message[]>, message) => {
    const date = new Date(message.created_at).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // Basculer entre la liste et la recherche
  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Liste des conversations (desktop et mobile) */}
        <div 
          className={`bg-white w-full md:w-80 border-r overflow-y-auto flex-shrink-0 
                      ${isMobileListVisible ? 'block' : 'hidden md:block'}`}
        >
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-serif font-bold">Mes messages</h2>
            <button 
              onClick={toggleSearch}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
              title="Nouvelle conversation"
            >
              <PlusCircle className="h-5 w-5" />
            </button>
          </div>
          
          {isSearchVisible ? (
            <div className="p-4">
              <SearchUser onClose={toggleSearch} />
            </div>
          ) : (
            <ConversationList onSelectConversation={setSelectedConversation} />
          )}
        </div>
        
        {/* Zone de conversation (desktop et mobile) */}
        <div 
          className={`flex-1 flex flex-col bg-white 
                      ${isMobileListVisible ? 'hidden md:flex' : 'flex'}`}
        >
          {selectedConversation ? (
            <>
              {/* En-tête de la conversation */}
              <div className="p-4 border-b flex items-center gap-4">
                <button 
                  onClick={() => setIsMobileListVisible(true)}
                  className="md:hidden text-gray-500"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                
                <img
                  src={selectedConversation.other_user.avatar_url || 'https://via.placeholder.com/40'}
                  alt={selectedConversation.other_user.full_name || 'User'}
                  className="h-8 w-8 rounded-full"
                />
                <div>
                  <h3 className="font-medium">
                    {selectedConversation.other_user.full_name || selectedConversation.other_user.email || 'Utilisateur'}
                  </h3>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date} className="space-y-4">
                    <div className="text-center">
                      <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
                        {date === new Date().toLocaleDateString() ? 'Aujourd\'hui' : formatDate(date)}
                      </span>
                    </div>
                    
                    {msgs.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg p-3 ${
                            message.sender_id === currentUser?.id
                              ? 'bg-red-600 text-white'
                              : 'bg-red-100'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <p className="text-xs opacity-70">
                              {formatTime(message.created_at)}
                            </p>
                            {message.sender_id === currentUser?.id && (
                              <span className="text-xs opacity-70">
                                {message.read ? ' • Vu' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Formulaire d'envoi */}
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Votre message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={loading || !newMessage.trim()}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Envoyer
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-500">
              <div>
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Vos messages</h3>
                <p>Sélectionnez une conversation pour commencer à discuter</p>
                <button
                  onClick={toggleSearch}
                  className="mt-4 flex items-center gap-2 mx-auto bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Nouvelle conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;