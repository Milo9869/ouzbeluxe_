// scripts/test-supabase-connection.js
// Exécuter avec: node scripts/test-supabase-connection.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xdajeclxygfgucbikqxr.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYWplY2x4eWdmZ3VjYmlrcXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMTA2OTEsImV4cCI6MjA1Nzg4NjY5MX0.1lbGRv1eY5ELCvNzBSNNAEIfxmjG9-pazn8ukjwuSv4';

// Créer le client
const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction principale
async function testConnection() {
  console.log(`Test de connexion à Supabase...`);
  console.log(`URL: ${supabaseUrl}`);
  
  try {
    // Test de la connexion de base en vérifiant une table qui existe certainement: auth.users
    const { count, error: authError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (authError) {
      console.error('❌ Erreur de connexion à la base:', authError.message);
      return;
    }
    
    console.log('✅ Connexion à Supabase réussie!');
    console.log(`✅ Table "profiles" accessible (${count} enregistrements)`);
    
    // Tester l'accès aux tables importantes
    const tables = ['products', 'messages', 'conversations', 'conversation_participants'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          if (error.code === '42P01') { // Code pour "relation does not exist"
            console.error(`❌ Table "${table}" n'existe pas dans la base de données`);
          } else {
            console.error(`❌ Erreur pour la table "${table}":`, error.message);
          }
        } else {
          console.log(`✅ Table "${table}" accessible (${count} enregistrements)`);
        }
      } catch (tableError) {
        console.error(`❌ Erreur lors du test de la table "${table}":`, tableError);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

// Exécuter le test
testConnection();