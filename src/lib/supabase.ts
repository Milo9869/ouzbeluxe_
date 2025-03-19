// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Variables d'environnement pour Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Utiliser les variables d'environnement ou les valeurs de xdajeclxygfgucbikqxr (projet avec migrations)
const url = supabaseUrl || 'https://xdajeclxygfgucbikqxr.supabase.co';
const key = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYWplY2x4eWdmZ3VjYmlrcXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMTA2OTEsImV4cCI6MjA1Nzg4NjY5MX0.1lbGRv1eY5ELCvNzBSNNAEIfxmjG9-pazn8ukjwuSv4';

// Créer le client Supabase
export const supabase = createClient(url, key);

// Log pour le débogage (en mode développement uniquement)
if (import.meta.env.DEV) {
  console.log('Supabase URL utilisée:', url);
  console.log('Supabase est correctement initialisé');
}