// src/lib/notificationService.ts
import { supabase } from './supabase';
import { Message } from './messageService';

// Configurer les notifications globales pour les messages
export function setupGlobalMessageNotifications(userId: string, onNewMessage: (data: Message) => void) {
  const channel = supabase
    .channel('global-message-notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `receiver_id=eq.${userId}`,
    }, (payload) => {
      onNewMessage(payload.new as Message);
    })
    .subscribe();
    
  return channel;
}

// Configurer les notifications pour une conversation spécifique
export function setupConversationNotifications(
  conversationId: string, 
  onNewMessage: (data: Message) => void,
  onMessageRead: (data: Message) => void
) {
  const channel = supabase
    .channel(`conversation-${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      onNewMessage(payload.new as Message);
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      if (payload.old.read === false && payload.new.read === true) {
        onMessageRead(payload.new as Message);
      }
    })
    .subscribe();
    
  return channel;
}