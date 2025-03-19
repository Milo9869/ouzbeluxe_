// scripts/check-url.js
import { createClient } from '@supabase/supabase-js';

// Les deux URLs distinctes qui apparaissent dans vos logs
const urls = [
  'https://xdajeclxygfgucbikqxr.supabase.co',  // Celle utilisée dans le script check-supabase.js
  'https://wdzpgaxvffcgrjlzftcx.supabase.co'    // Celle visible dans vos logs (supabase.ts:21)
];

// La clé affichée dans votre log
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkenBnYXh2ZmZjZ3JqbHpmdGN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MzM4NDksImV4cCI6MjA1NzIwOTg0OX0.ABdn_uAdwpxHbM3iV02Aizxr2BKmFqgvRPRQHUSzHzk';

// Tester les deux URLs
async function checkUrls() {
  console.log("Vérification des URLs Supabase...\n");
  
  for (const url of urls) {
    // Extraire le référentiel de l'URL
    const ref = url.split('.')[0].replace('https://', '');
    console.log(`Testant URL: ${url} (ref: ${ref})`);
    
    try {
      // Créer un client Supabase
      const supabase = createClient(url, anonKey);
      
      // Tester la connexion
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ ÉCHEC pour ${url}: ${error.message}\n`);
      } else {
        console.log(`✅ SUCCÈS pour ${url}\n`);
        
        // Tester la table products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('count')
          .limit(1);
        
        if (productsError) {
          console.log(`❌ Table products inaccessible: ${productsError.message}\n`);
        } else {
          console.log(`✅ Table products accessible\n`);
        }
      }
    } catch (err) {
      console.log(`❌ ERREUR pour ${url}: ${err}\n`);
    }
  }
}

checkUrls();