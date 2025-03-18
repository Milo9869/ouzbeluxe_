import React, { useState, useEffect } from 'react';
import { Search, Heart, Menu, User, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from './AuthModal';
import ProfileModal from './ProfileModal';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Navbar = () => {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      
      if (user) {
        fetchUnreadMessages(user.id);
      }
    };
    
    checkAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        fetchUnreadMessages(session.user.id);
      } else {
        setUnreadMessages(0);
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Abonnement aux nouveaux messages
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        async () => {
          // Recharger le nombre de messages non lus
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            fetchUnreadMessages(user.id);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const fetchUnreadMessages = async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .neq('sender_id', userId);
        
      if (error) throw error;
      setUnreadMessages(count || 0);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Déconnexion réussie');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Erreur lors de la déconnexion: ${error.message}`);
      } else {
        toast.error('Erreur lors de la déconnexion');
      }
    }
  };

  const handleUserClick = () => {
    if (isAuthenticated) {
      setIsProfileModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  return (
    <>
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span 
                onClick={() => navigate('/')}
                className="text-2xl font-serif font-bold text-gray-900 cursor-pointer"
              >
                Le Marché Luxe
              </span>
            </div>

            <div className="hidden md:flex items-center flex-1 justify-center px-8">
              <div className="relative w-full max-w-lg">
                <input
                  type="text"
                  placeholder="Rechercher un produit de luxe..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-6">
              <button className="text-gray-600 hover:text-gray-900">
                <Heart className="h-6 w-6" />
              </button>
              
              {isAuthenticated && (
                <button 
                  onClick={() => navigate('/messages')}
                  className="text-gray-600 hover:text-gray-900 relative"
                >
                  <MessageCircle className="h-6 w-6" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </button>
              )}
              
              <button 
                onClick={handleUserClick}
                className="text-gray-600 hover:text-gray-900"
              >
                <User className="h-6 w-6" />
              </button>
              
              {isAuthenticated && (
                <button 
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Déconnexion
                </button>
              )}
              
              <button 
                onClick={() => navigate('/create-product')}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Déposer une annonce
              </button>
            </div>

            <div className="md:hidden flex items-center space-x-4">
              {isAuthenticated && (
                <button 
                  onClick={() => navigate('/messages')}
                  className="text-gray-600 hover:text-gray-900 relative"
                >
                  <MessageCircle className="h-6 w-6" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </button>
              )}
              
              <button 
                onClick={handleUserClick}
                className="text-gray-600 hover:text-gray-900"
              >
                <User className="h-6 w-6" />
              </button>
              
              <button className="text-gray-600 hover:text-gray-900">
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};

export default Navbar;