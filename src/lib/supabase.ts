// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Variables d'environnement pour Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Valeurs de secours pour le développement ou en cas d'erreur
const fallbackUrl = 'https://wdzpgaxvffcgrjlzftcx.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkenBnYXh2ZmZjZ3JqbHpmdGN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MzM4NDksImV4cCI6MjA1NzIwOTg0OX0.ABdn_uAdwpxHbM3iV02Aizxr2BKmFqgvRPRQHUSzHzk';

// Utiliser les variables d'environnement ou les valeurs de secours
const url = supabaseUrl || fallbackUrl;
const key = supabaseAnonKey || fallbackKey;

// Créer le client Supabase
export const supabase = createClient(url, key);

// Log pour le débogage (en mode développement uniquement)
if (import.meta.env.DEV) {
  console.log('Supabase URL utilisée:', url);
  console.log('Supabase est correctement initialisé');
}