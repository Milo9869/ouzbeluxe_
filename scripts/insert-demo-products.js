// scripts/insert-demo-products.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur: Variables d\'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const demoProducts = [
  {
    title: "Montre Vintage Cartier Tank",
    description: "Authentique montre Cartier Tank en or, excellent état",
    price: 12500,
    location: "Paris 8ème",
    images: ["/api/placeholder/400/300"],
    status: "active",
    category: "Montres",
    brand: "Cartier",
    condition: "Excellent",
    negotiable: true
  },
  {
    title: "Sac Kelly Hermès",
    description: "Sac Kelly 28 en cuir Togo noir, état neuf",
    price: 18900,
    location: "Lyon",
    images: ["/api/placeholder/400/300"],
    status: "active",
    category: "Sacs",
    brand: "Hermès",
    condition: "Neuf",
    negotiable: false
  },
  {
    title: "Foulard en Soie Chanel",
    description: "Foulard vintage en soie, motif camélia",
    price: 450,
    location: "Bordeaux", 
    images: ["/api/placeholder/400/300"],
    status: "active",
    category: "Accessoires",
    brand: "Chanel",
    condition: "Bon",
    negotiable: true
  }
]

async function insertDemoProducts() {
  try {
    // 1. Obtenir les utilisateurs avec l'API auth
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('Erreur lors de la récupération des utilisateurs:', userError)
      return
    }
    
    // Si aucun utilisateur n'existe, créer un utilisateur demo
    let userId
    if (!users || users.length === 0) {
      console.log('Aucun utilisateur trouvé, création d\'un utilisateur demo...')
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'demo@exemple.fr',
        password: 'password123',
        email_confirm: true
      })
      
      if (createError) {
        console.error('Erreur lors de la création de l\'utilisateur demo:', createError)
        return
      }
      
      userId = newUser?.user?.id
      console.log('Utilisateur demo créé avec ID:', userId)
    } else {
      userId = users[0].id
      console.log('Utilisateur existant trouvé avec ID:', userId)
    }
    
    // 2. Vérifier si la table products existe
    try {
      const { error: tableCheckError } = await supabase
        .from('products')
        .select('id')
        .limit(1)
      
      if (tableCheckError && tableCheckError.message.includes('does not exist')) {
        console.error('La table products n\'existe pas encore:', tableCheckError.message)
        return
      }
    } catch (err) {
      console.error('Erreur lors de la vérification de la table products:', err)
      return
    }
    
    // 3. Insérer les produits de démo
    for (const product of demoProducts) {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...product,
          user_id: userId
        })
        .select()
      
      if (error) {
        console.error(`Erreur lors de l'insertion du produit "${product.title}":`, error)
      } else {
        console.log(`Produit "${product.title}" inséré avec succès.`)
      }
    }
    
    console.log('Importation des produits de démo terminée.')
  } catch (error) {
    console.error('Erreur non gérée:', error)
  }
}

insertDemoProducts()