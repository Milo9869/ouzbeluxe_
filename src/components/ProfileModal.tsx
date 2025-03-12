import React from 'react';
import { X, User, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Déconnexion réussie');
      onClose();
      navigate('/');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Erreur lors de la déconnexion: ${error.message}`);
      } else {
        toast.error('Erreur lors de la déconnexion');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Mon Profil</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4">
          <button
            onClick={() => {
              onClose();
              navigate('/profile');
            }}
            className="flex items-center w-full p-3 text-left hover:bg-gray-100 rounded-lg mb-2"
          >
            <User className="h-5 w-5 mr-3 text-gray-600" />
            <span>Mes annonces</span>
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/profile/settings');
            }}
            className="flex items-center w-full p-3 text-left hover:bg-gray-100 rounded-lg mb-2"
          >
            <Settings className="h-5 w-5 mr-3 text-gray-600" />
            <span>Paramètres</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 text-left hover:bg-gray-100 rounded-lg text-red-600"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;