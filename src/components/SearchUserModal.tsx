// src/components/SearchUserModal.tsx
import React from 'react';
import SearchUser from './SearchUser';

interface SearchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
}

const SearchUserModal: React.FC<SearchUserModalProps> = ({ isOpen, onClose, productId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <SearchUser onClose={onClose} productId={productId} />
      </div>
    </div>
  );
};

export default SearchUserModal;