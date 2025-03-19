// src/components/auth/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { AuthModal } from '../AuthModal'
import { useState, useEffect } from 'react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (!user && !loading) {
      setIsAuthModalOpen(true)
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => {
            setIsAuthModalOpen(false)
            // Rediriger vers la page d'accueil si l'utilisateur ferme le modal
            window.location.href = '/'
          }}
        />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </>
    )
  }

  return <>{children}</>
} 