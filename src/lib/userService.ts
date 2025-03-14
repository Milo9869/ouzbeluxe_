// src/lib/userService.ts
import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  country?: string | null;
  updated_at?: string | null;
}

// Récupérer le profil de l'utilisateur actuel
export async function getCurrentUserProfile() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { data: null, error: authError };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Error getting current user profile:', error);
    return { 
      data: null, 
      error: error instanceof Error 
        ? { message: error.message, code: '', details: '', hint: '' } as PostgrestError 
        : null 
    };
  }
}

// Rechercher des utilisateurs
export async function searchUsers(query: string, currentUserId: string | null = null) {
  try {
    let queryBuilder = supabase
      .from('profiles')
      .select('id, email, username, full_name, avatar_url')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(20);
      
    // Exclure l'utilisateur actuel si spécifié
    if (currentUserId) {
      queryBuilder = queryBuilder.neq('id', currentUserId);
    }
    
    const { data, error } = await queryBuilder;
    
    return { data, error };
  } catch (error) {
    console.error('Error searching users:', error);
    return { 
      data: null, 
      error: error instanceof Error 
        ? { message: error.message, code: '', details: '', hint: '' } as PostgrestError 
        : null 
    };
  }
}

// Obtenir le profil d'un utilisateur par ID
export async function getUserProfileById(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { 
      data: null, 
      error: error instanceof Error 
        ? { message: error.message, code: '', details: '', hint: '' } as PostgrestError 
        : null 
    };
  }
}

// Mettre à jour le profil d'un utilisateur
export async function updateUserProfile(profile: Partial<UserProfile>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { 
        data: null, 
        error: { message: 'Utilisateur non connecté', code: '401', details: '', hint: '' } as PostgrestError 
      };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...profile,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { 
      data: null, 
      error: error instanceof Error 
        ? { message: error.message, code: '', details: '', hint: '' } as PostgrestError 
        : null 
    };
  }
}