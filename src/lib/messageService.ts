// src/lib/messageService.ts
import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  message_type?: string;
  offer_amount?: number;
  offer_status?: string;
}

export interface Conversation {
  id: string;
  product_id: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithParticipants extends Conversation {
  participants: { user_id: string }[];
}

export interface ConversationSummary {
  id: string;
  product_id: string;
  other_user: {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
}

// Créer une nouvelle conversation
export async function createConversation(productId: string, participants: string[]) {
  console.log("createConversation appelé avec:", { productId, participants });
  
  try {
    // 1. Créer la conversation
    console.log("Création de la conversation...");
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({ product_id: productId })
      .select()
      .single();

    console.log("Résultat création conversation:", { conversation, convError });
    
    if (convError) {
      console.error("Erreur création conversation:", convError);
      throw convError;
    }

    // 2. Ajouter les participants
    console.log("Ajout des participants...");
    const participantPromises = participants.map(userId => {
      console.log("Ajout participant:", userId, "à conversation:", conversation.id);
      return supabase
        .from('conversation_participants')
        .insert({ conversation_id: conversation.id, user_id: userId });
    });

    const participantResults = await Promise.all(participantPromises);
    console.log("Résultats ajout participants:", participantResults);
    
    // Vérifier les erreurs
    const errors = participantResults.filter(result => result.error);
    if (errors.length > 0) {
      console.error("Erreurs ajout participants:", errors);
      throw errors[0].error;
    }

    return { data: conversation, error: null };
  } catch (error) {
    console.error('Erreur complète createConversation:', error);
    return { data: null, error };
  }
}

// Trouver ou créer une conversation entre utilisateurs pour un produit
export async function findOrCreateConversation(productId: string, userId: string, otherUserId: string) {
  console.log("findOrCreateConversation appelé avec:", { productId, userId, otherUserId });
  
  try {
    // Méthode alternative qui évite les politiques RLS récursives
    return findOrCreateConversationAlternative(productId, userId, otherUserId);
  } catch (error) {
    console.error('Erreur complète findOrCreateConversation:', error);
    return { data: null, error };
  }
}

// Version alternative pour éviter les problèmes de récursion
async function findOrCreateConversationAlternative(productId: string, userId: string, otherUserId: string) {
  try {
    console.log('Recherche de conversation pour', { productId, userId, otherUserId });
    
    // Obtenir toutes les conversations de l'utilisateur
    const { data: userConversations, error: userConvsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);
    
    if (userConvsError) throw userConvsError;
    
    if (!userConversations || userConversations.length === 0) {
      console.log('Aucune conversation trouvée pour cet utilisateur');
      return createNewConversation(productId, userId, otherUserId);
    }
    
    // Vérifier si l'autre utilisateur est dans une de ces conversations
    const conversationIds = userConversations.map(uc => uc.conversation_id);
    
    const { data: otherUserConvs, error: otherUserError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', conversationIds);
    
    if (otherUserError) throw otherUserError;
    
    // Vérifier maintenant si une de ces conversations concerne le produit
    if (otherUserConvs && otherUserConvs.length > 0) {
      const sharedConvIds = otherUserConvs.map(c => c.conversation_id);
      
      const { data: prodConvs, error: prodConvsError } = await supabase
        .from('conversations')
        .select('id')
        .eq('product_id', productId)
        .in('id', sharedConvIds);
      
      if (prodConvsError) throw prodConvsError;
      
      if (prodConvs && prodConvs.length > 0) {
        console.log('Conversation existante trouvée:', prodConvs[0].id);
        return { data: { id: prodConvs[0].id }, error: null };
      }
    }
    
    // Si on arrive ici, aucune conversation existante n'a été trouvée
    return createNewConversation(productId, userId, otherUserId);
  } catch (error) {
    console.error('Erreur dans findOrCreateConversationAlternative:', error);
    return { data: null, error };
  }
}

// Fonction auxiliaire pour créer une nouvelle conversation
async function createNewConversation(productId: string, userId: string, otherUserId: string) {
  console.log("Création d'une nouvelle conversation");
  
  try {
    // 1. Créer la conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({ product_id: productId })
      .select()
      .single();
    
    console.log("Résultat création conversation:", { conversation, convError });
    
    if (convError) {
      console.error("Erreur création conversation:", convError);
      throw convError;
    }
    
    // 2. Ajouter les participants
    const promises = [
      supabase
        .from('conversation_participants')
        .insert({ conversation_id: conversation.id, user_id: userId }),
      supabase
        .from('conversation_participants')
        .insert({ conversation_id: conversation.id, user_id: otherUserId })
    ];
    
    const results = await Promise.all(promises);
    console.log("Résultats ajout participants:", results);
    
    // Vérifier les erreurs
    const errors = results.filter(r => r.error).map(r => r.error);
    if (errors.length > 0) {
      console.error("Erreurs lors de l'ajout des participants:", errors);
      throw errors[0];
    }
    
    return { data: conversation, error: null };
  } catch (error) {
    console.error("Erreur création nouvelle conversation:", error);
    return { data: null, error };
  }
}

// Envoyer un message
export async function sendMessage(conversationId: string, senderId: string, content: string) {
  console.log("sendMessage appelé:", { conversationId, senderId, content });
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
        read: false
      })
      .select()
      .single();

    console.log("Résultat envoi message:", { data, error });
    return { data, error };
  } catch (error) {
    console.error('Error sending message:', error);
    return { data: null, error };
  }
}

// Récupérer les messages d'une conversation
export async function getConversationMessages(conversationId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    return { data, error };
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    return { data: null, error };
  }
}

// Marquer un message comme lu
export async function markMessageAsRead(messageId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error marking message as read:', error);
    return { data: null, error };
  }
}

// Marquer tous les messages non lus d'une conversation comme lus
export async function markAllMessagesAsRead(conversationId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', userId)
      .select();

    return { data, error };
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    return { data: null, error };
  }
}

// Rechercher des utilisateurs
export async function searchUsers(query: string, currentUserId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq('id', currentUserId)
      .limit(20);

    return { data, error };
  } catch (error) {
    console.error('Error searching users:', error);
    return { data: null, error };
  }
}

// Récupérer toutes les conversations d'un utilisateur avec résumé (version améliorée)
export async function getUserConversations(userId: string) {
  try {
    // 1. Obtenir toutes les conversations auxquelles l'utilisateur participe
    const { data: userConversations, error: userConvsError } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations:conversation_id(
          id,
          product_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);
    
    if (userConvsError) throw userConvsError;
    
    if (!userConversations || userConversations.length === 0) {
      return { data: [], error: null };
    }
    
    // 2. Construire les résumés de conversation
    const summaries = [];
    
    for (const conv of userConversations) {
      const conversation = conv.conversations as unknown as Conversation;
      
      // Obtenir les autres participants
      const { data: otherParticipants, error: partError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conv.conversation_id)
        .neq('user_id', userId);
      
      if (partError) continue;
      
      if (!otherParticipants || otherParticipants.length === 0) continue;
      
      const otherUserId = otherParticipants[0].user_id;
      
      // Obtenir les informations de l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', otherUserId)
        .single();
      
      if (userError) continue;
      
      // Obtenir le dernier message
      const { data: lastMessages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.conversation_id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (msgError) continue;
      
      // Compter les messages non lus
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.conversation_id)
        .eq('read', false)
        .neq('sender_id', userId);
      
      if (countError) continue;
      
      // Construire le résumé
      summaries.push({
        id: conversation.id,
        product_id: conversation.product_id,
        other_user: {
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url
        },
        last_message: lastMessages && lastMessages.length > 0 ? {
          content: lastMessages[0].content,
          created_at: lastMessages[0].created_at,
          sender_id: lastMessages[0].sender_id
        } : undefined,
        unread_count: count || 0
      });
    }
    
    return { data: summaries, error: null };
  } catch (error) {
    console.error('Erreur dans getUserConversations:', error);
    return { data: null, error: error instanceof Error ? { message: error.message, code: '', details: '', hint: '' } as PostgrestError : null };
  }
}

// Supprimer une conversation
export async function deleteConversation(conversationId: string) {
  try {
    // Supprimer d'abord tous les messages de la conversation
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);
      
    if (messagesError) throw messagesError;
    
    // Supprimer ensuite les participants
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId);
      
    if (participantsError) throw participantsError;
    
    // Enfin, supprimer la conversation elle-même
    const { data, error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .select();
      
    return { data, error };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return { data: null, error };
  }
}

// Vérifier si une conversation existe entre deux utilisateurs pour un produit
export async function checkConversationExists(productId: string, userId: string, otherUserId: string) {
  try {
    return findOrCreateConversationAlternative(productId, userId, otherUserId);
  } catch (error) {
    console.error('Error checking conversation:', error);
    return { exists: false, conversationId: null, error };
  }
}

// Accepter une offre
export async function acceptOffer(messageId: string) {
  try {
    // 1. Mettre à jour le statut de l'offre
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .update({ offer_status: 'accepted' })
      .eq('id', messageId)
      .select()
      .single();
      
    if (messageError) throw messageError;
    
    // 2. Envoyer un message de confirmation dans la conversation
    const { error: notificationError } = await supabase
      .from('messages')
      .insert({
        conversation_id: message.conversation_id,
        sender_id: message.sender_id, // L'acheteur est informé que son offre est acceptée
        content: `Offre de ${message.offer_amount}€ acceptée par le vendeur`,
        message_type: 'system',
        read: false
      });
      
    if (notificationError) throw notificationError;
    
    return { data: message, error: null };
  } catch (error) {
    console.error('Error accepting offer:', error);
    return { data: null, error };
  }
}

// Décliner une offre
export async function declineOffer(messageId: string) {
  try {
    // 1. Mettre à jour le statut de l'offre
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .update({ offer_status: 'declined' })
      .eq('id', messageId)
      .select()
      .single();
      
    if (messageError) throw messageError;
    
    // 2. Envoyer un message de notification dans la conversation
    const { error: notificationError } = await supabase
      .from('messages')
      .insert({
        conversation_id: message.conversation_id,
        sender_id: message.sender_id, // L'acheteur est informé que son offre est déclinée
        content: `Offre de ${message.offer_amount}€ déclinée par le vendeur`,
        message_type: 'system',
        read: false
      });
      
    if (notificationError) throw notificationError;
    
    return { data: message, error: null };
  } catch (error) {
    console.error('Error declining offer:', error);
    return { data: null, error };
  }
}