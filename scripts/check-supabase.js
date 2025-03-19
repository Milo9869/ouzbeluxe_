// scripts/check-supabase.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes')
  console.error('SUPABASE_URL (ou VITE_SUPABASE_URL):', supabaseUrl ? '✅' : '❌')
  console.error('SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY):', supabaseKey ? '✅' : '❌')
  process.exit(1)
}

console.log('📃 Configuration:')
console.log('- URL:', supabaseUrl)
console.log('- Clé Anon:', supabaseKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSupabase() {
  console.log('\n🔄 Vérification de la connexion Supabase...')
  
  try {
    // Test de base - récupérer la version de la base de données
    const { data: versionData, error: versionError } = await supabase
      .rpc('version')
      .select()
    
    if (versionError) {
      console.error('❌ Erreur de connexion:', versionError)
    } else {
      console.log('✅ Connexion établie!')
      console.log('- Version:', versionData)
    }
    
    // Vérifier si la table profiles existe
    console.log('\n🔄 Vérification de la table profiles...')
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (profilesError) {
      console.error('❌ Table profiles non accessible:', profilesError.message)
    } else {
      console.log('✅ Table profiles accessible')
    }
    
    // Vérifier si la table products existe
    console.log('\n🔄 Vérification de la table products...')
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('count')
      .limit(1)
    
    if (productsError) {
      console.error('❌ Table products non accessible:', productsError.message)
    } else {
      console.log('✅ Table products accessible')
    }
    
    // Vérifier les tables de conversations
    console.log('\n🔄 Vérification des tables de messagerie...')
    const tables = ['conversations', 'conversation_participants', 'messages']
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      if (error) {
        console.error(`❌ Table ${table} non accessible:`, error.message)
      } else {
        console.log(`✅ Table ${table} accessible`)
      }
    }
    
    // Liste des politiques
    console.log('\n📋 Résumé des vérifications:')
    
    // Authentification
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        console.error('❌ Problème avec l\'authentification:', authError.message)
      } else if (session) {
        console.log('✅ Authentification: session utilisateur active')
      } else {
        console.log('ℹ️ Authentification: aucune session active')
      }
    } catch (err) {
      console.error('❌ Erreur lors de la vérification de l\'authentification:', err)
    }
    
  } catch (error) {
    console.error('❌ Erreur non gérée:', error)
  }
}

checkSupabase()