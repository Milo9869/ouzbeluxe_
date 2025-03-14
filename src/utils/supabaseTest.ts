// src/utils/supabaseTest.ts
import { supabase } from '../lib/supabase';

/**
 * Fonction de test de connexion Supabase
 * À importer et exécuter dans un composant pour vérifier la connexion
 */
export async function testSupabaseConnection() {
  console.log('Test de connexion à Supabase:');
  
  // Tester une requête simple
  try {
    console.log('Test de requête simple...');
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return { success: false, error };
    }
    
    console.log('✅ Requête réussie! Nombre total de profils:', count);
    console.log('Premier profil (exemple):', data?.[0] || 'Aucun profil trouvé');
    
    return { success: true, data, count };
  } catch (err) {
    console.error('❌ Exception lors de la requête:', err);
    return { success: false, error: err };
  }
}

/**
 * Test spécifique de la recherche d'utilisateurs
 */
export async function testUserSearch(query: string) {
  console.log(`Test de recherche d'utilisateurs pour "${query}":`);
  
  try {
    // Version 1: OR avec ilike
    console.log('Méthode 1: OR avec ilike');
    const { data: data1, error: error1 } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);
    
    console.log('Résultats méthode 1:', data1?.length || 0, error1 ? `Erreur: ${error1.message}` : 'OK');
    
    // Version 2: OR avec opérateurs distincts 
    console.log('Méthode 2: OR avec opérateurs distincts');
    const { data: data2, error: error2 } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .or('email.ilike.%' + query + '%,full_name.ilike.%' + query + '%')
      .limit(10);
    
    console.log('Résultats méthode 2:', data2?.length || 0, error2 ? `Erreur: ${error2.message}` : 'OK');
    
    // Version 3: Requêtes distinctes
    console.log('Méthode 3: Requêtes distinctes avec ILike');
    const { data: data3, error: error3 } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .ilike('email', `%${query}%`)
      .limit(10);
    
    const { data: data4, error: error4 } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .ilike('full_name', `%${query}%`)
      .limit(10);
    
    console.log('Résultats méthode 3 (email):', data3?.length || 0, error3 ? `Erreur: ${error3.message}` : 'OK');
    console.log('Résultats méthode 3 (full_name):', data4?.length || 0, error4 ? `Erreur: ${error4.message}` : 'OK');
    
    // Vérifier s'il y a des utilisateurs dans la base
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log('Nombre total de profils dans la base:', count);
    
    return { 
      success: !(error1 || error2 || error3 || error4),
      results: {
        method1: { data: data1, error: error1 },
        method2: { data: data2, error: error2 },
        method3Email: { data: data3, error: error3 },
        method3FullName: { data: data4, error: error4 }
      },
      totalProfiles: count
    };
  } catch (err) {
    console.error('❌ Exception lors du test de recherche:', err);
    return { success: false, error: err };
  }
}