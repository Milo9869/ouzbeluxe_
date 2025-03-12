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

// Afficher une page d'erreur en cas de problème
const ErrorPage = ({ error }: { error: Error | string }) => (
  <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
    <h1>Erreur de chargement</h1>
    <p>Une erreur s'est produite lors du chargement de l'application.</p>
    <p>Détails de l'erreur: {error instanceof Error ? error.message : String(error)}</p>
    
    <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8f8f8', borderRadius: '4px', textAlign: 'left' }}>
      <h3>Dépannage :</h3>
      <ul>
        <li>Vérifiez que vous êtes connecté à Internet</li>
        <li>Essayez de vider le cache de votre navigateur</li>
        <li>Contactez le support si le problème persiste</li>
      </ul>
    </div>
  </div>
);

// Fonction principale pour rendre l'application
function renderApp() {
  try {
    // Capture d'erreurs pour faciliter le débogage
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error("L'élément root n'a pas été trouvé dans le DOM");
      const newRoot = document.createElement('div');
      newRoot.id = 'root';
      document.body.appendChild(newRoot);
      console.log('Élément root créé dynamiquement');
    }

    // Afficher une simple div dans le DOM pour vérifier que le JavaScript s'exécute bien
    const testElement = document.createElement('div');
    testElement.id = 'test-render';
    testElement.textContent = 'Si vous voyez ce message, le JavaScript fonctionne.';
    testElement.style.display = 'none';
    document.body.appendChild(testElement);

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
    const rootElement = document.getElementById('root');
    if (rootElement) {
      createRoot(rootElement).render(<ErrorPage error={error as Error | string} />);
    } else {
      document.body.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h1>Erreur critique</h1>
          <p>Impossible de charger l'application.</p>
          <p>Détails de l'erreur: ${error instanceof Error ? error.message : String(error)}</p>
        </div>
      `;
    }
  }
}

// Exécuter la fonction de rendu
renderApp();