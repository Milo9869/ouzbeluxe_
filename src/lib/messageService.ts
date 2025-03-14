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
  try {
    // 1. Créer la conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({ product_id: productId })
      .select()
      .single();

    if (convError) throw convError;

    // 2. Ajouter les participants
    const participantPromises = participants.map(userId =>
      supabase
        .from('conversation_participants')
        .insert({ conversation_id: conversation.id, user_id: userId })
    );

    await Promise.all(participantPromises);

    return { data: conversation, error: null };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return { data: null, error };
  }
}

// Trouver ou créer une conversation entre utilisateurs pour un produit
export async function findOrCreateConversation(productId: string, userId: string, otherUserId: string) {
  try {
    // 1. Rechercher les conversations existantes de l'utilisateur pour ce produit
    const { data: userConversations, error: convError } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations:conversations!inner(
          id,
          product_id
        )
      `)
      .eq('user_id', userId);

    if (convError) throw convError;

    // 2. Pour chaque conversation, vérifier si l'autre utilisateur est participant
    if (userConversations && userConversations.length > 0) {
      for (const conv of userConversations) {
        const conversation = conv.conversations as unknown as Conversation;
        
        // Vérifier si c'est pour le même produit
        if (conversation.product_id !== productId) {
          continue;
        }
        
        // Vérifier si l'autre utilisateur fait partie de cette conversation
        const { data: participants, error: partError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id)
          .eq('user_id', otherUserId);

        if (!partError && participants && participants.length > 0) {
          // Conversation trouvée
          return { data: conversation, error: null };
        }
      }
    }

    // 3. Aucune conversation trouvée, en créer une nouvelle
    return await createConversation(productId, [userId, otherUserId]);
  } catch (error) {
    console.error('Error finding or creating conversation:', error);
    return { data: null, error };
  }
}

// Envoyer un message
export async function sendMessage(conversationId: string, senderId: string, content: string) {
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

    if (convError) throw convError;
    if (!userConversations || userConversations.length === 0) {
      return { data: [], error: null };
    }

    // 2. Construire le tableau de résumés de conversations
    const conversationSummaries: ConversationSummary[] = [];
      
    for (const conv of userConversations) {
      // Trouver l'autre participant
      const { data: participants, error: partError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conv.conversation_id)
        .neq('user_id', userId);
        
      if (partError) continue;
      
      if (!participants || participants.length === 0) continue;
      
      const otherUserId = participants[0].user_id;
      
      // Récupérer les informations de l'autre utilisateur
      const { data: otherUserInfo, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', otherUserId)
        .single();
        
      if (userError) continue;
      
      // Récupérer le dernier message
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