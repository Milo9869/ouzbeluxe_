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
    // 1. Rechercher si une conversation existe déjà (manuellement)
    console.log("Recherche manuelle de conversation existante");
    
    // 1.1 D'abord, récupérer toutes les conversations pour ce produit
    const { data: productConversations, error: prodError } = await supabase
      .from('conversations')
      .select('id')
      .eq('product_id', productId);
    
    if (prodError) {
      console.error("Erreur recherche conversations par produit:", prodError);
      throw prodError;
    }
    
    console.log("Conversations pour ce produit:", productConversations);
    
    // Si aucune conversation pour ce produit, en créer une nouvelle directement
    if (!productConversations || productConversations.length === 0) {
      return await createNewConversation(productId, userId, otherUserId);
    }
    
    // 1.2 Pour chaque conversation, vérifier si les deux utilisateurs sont participants
    for (const conv of productConversations) {
      // Vérifier les participants pour cette conversation
      const { data: participants, error: partError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conv.id);
      
      if (partError) {
        console.error("Erreur recherche participants:", partError);
        continue; // Essayer la conversation suivante
      }
      
      // Extraire les IDs des participants
      const participantIds = participants.map(p => p.user_id);
      
      // Vérifier si les deux utilisateurs sont dans cette conversation
      if (participantIds.includes(userId) && participantIds.includes(otherUserId)) {
        console.log("Conversation existante trouvée:", conv.id);
        
        // Récupérer les détails complets de la conversation
        const { data: convDetails, error: detailsError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conv.id)
          .single();
        
        if (detailsError) {
          console.error("Erreur récupération détails conversation:", detailsError);
          throw detailsError;
        }
        
        return { data: convDetails, error: null };
      }
    }
    
    // 2. Si aucune conversation existante, en créer une nouvelle
    return await createNewConversation(productId, userId, otherUserId);
    
  } catch (error) {
    console.error('Erreur complète findOrCreateConversation:', error);
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

// Récupérer toutes les conversations d'un utilisateur avec résumé
export async function getUserConversations(userId: string): Promise<{ data: ConversationSummary[] | null, error: PostgrestError | null }> {
  console.log("getUserConversations appelé pour userId:", userId);
  try {
    // 1. Récupérer toutes les conversations de l'utilisateur
    const { data: userConversations, error: convError } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations:conversations!inner(
          id,
          product_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);

    console.log("Résultat étape 1 getUserConversations:", { userConversations, convError });
    
    if (convError) throw convError;
    if (!userConversations || userConversations.length === 0) {
      return { data: [], error: null };
    }

    // 2. Construire le tableau de résumés de conversations
    const conversationSummaries: ConversationSummary[] = [];
      
    for (const conv of userConversations) {
      console.log("Traitement conversation:", conv.conversation_id);
      
      // Trouver l'autre participant
      const { data: participants, error: partError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conv.conversation_id)
        .neq('user_id', userId);
      
      console.log("Participants:", { participants, partError });
        
      if (partError) {
        console.error("Erreur participants:", partError);
        continue;
      }
      
      if (!participants || participants.length === 0) {
        console.log("Aucun autre participant trouvé");
        continue;
      }
      
      const otherUserId = participants[0].user_id;
      console.log("Autre participant:", otherUserId);
      
      // Récupérer les informations de l'autre utilisateur
      const { data: otherUserInfo, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', otherUserId)
        .single();
      
      console.log("Infos autre utilisateur:", { otherUserInfo, userError });
        
      if (userError) {
        console.error("Erreur infos utilisateur:", userError);
        continue;
      }
      
      // Récupérer le dernier message
      const { data: lastMessages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.conversation_id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log("Dernier message:", { lastMessages, msgError });
        
      if (msgError) {
        console.error("Erreur dernier message:", msgError);
        continue;
      }
      
      // Compter les messages non lus
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.conversation_id)
        .eq('read', false)
        .neq('sender_id', userId);
      
      console.log("Messages non lus:", { count, countError });
        
      if (countError) {
        console.error("Erreur comptage non lus:", countError);
        continue;
      }
      
      const conversation = conv.conversations as unknown as Conversation;
      
      conversationSummaries.push({
        id: conversation.id,
        product_id: conversation.product_id,
        other_user: {
          id: otherUserInfo.id,
          email: otherUserInfo.email,
          full_name: otherUserInfo.full_name,
          avatar_url: otherUserInfo.avatar_url
        },
        last_message: lastMessages && lastMessages.length > 0 ? {
          content: lastMessages[0].content,
          created_at: lastMessages[0].created_at,
          sender_id: lastMessages[0].sender_id
        } : undefined,
        unread_count: count || 0
      });
    }

    console.log("Résumés de conversations créés:", conversationSummaries.length);
    return { data: conversationSummaries, error: null };
  } catch (error) {
    console.error('Error getting user conversations:', error);
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
    // 1. Rechercher les conversations pour ce produit
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        conversation_participants!inner(user_id)
      `)
      .eq('product_id', productId);
      
    if (convError) throw convError;
    
    if (!conversations || conversations.length === 0) {
      return { exists: false, conversationId: null, error: null };
    }
    
    // 2. Pour chaque conversation, vérifier si les deux utilisateurs sont participants
    for (const conv of conversations) {
      // Vérifier si l'utilisateur actuel est participant
      const { data: currentUserParticipant, error: currError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conv.id)
        .eq('user_id', userId)
        .single();
        
      if (currError) continue;
      
      // Vérifier si l'autre utilisateur est participant
      const { data: otherUserParticipant, error: otherError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conv.id)
        .eq('user_id', otherUserId)
        .single();
        
      if (otherError) continue;
      
      // Si les deux sont participants, la conversation existe
      if (currentUserParticipant && otherUserParticipant) {
        return { exists: true, conversationId: conv.id, error: null };
      }
    }
    
    return { exists: false, conversationId: null, error: null };
  } catch (error) {
    console.error('Error checking conversation:', error);
    return { exists: false, conversationId: null, error };
  }
}