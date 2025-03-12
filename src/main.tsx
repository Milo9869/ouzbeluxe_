import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import CreateProduct from './components/CreateProduct';
import UserProfile from './components/UserProfile';
import ProfileSettings from './components/ProfileSettings';
import MessagesPage from './components/MessagesPage';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import './index.css';

// Capture d'erreurs pour faciliter le débogage
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("L'élément root n'a pas été trouvé dans le DOM");
  // Créer un élément racine s'il n'existe pas
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
  console.log('Élément root créé dynamiquement');
}

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/create-product" element={
              <ProtectedRoute>
                <CreateProduct />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            <Route path="/profile/settings" element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
  console.log("Application rendue avec succès");
} catch (error) {
  console.error("Erreur lors du rendu de l'application:", error);
  
  // Afficher une page de secours en cas d'erreur
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>Erreur de chargement</h1>
        <p>Une erreur s'est produite lors du chargement de l'application.</p>
        <p>Détails de l'erreur: ${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `;
  }
}