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
  
  conversationSummaries.push({
    id: conv.conversations.id,
    product_id: conv.conversations.product_id,
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
return { data: null, error };
}
} src/lib/messageService.ts
import { supabase } from './supabase';

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
const { data: existingConversations, error: convError } = await supabase
  .from('conversations')
  .select(`
    id,
    product_id,
    conversation_participants!inner(user_id)
  `)
  .eq('product_id', productId)
  .eq('conversation_participants.user_id', userId);

if (convError) throw convError;

// 2. Vérifier si l'autre utilisateur fait partie d'une de ces conversations
if (existingConversations && existingConversations.length > 0) {
  for (const conv of existingConversations) {
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conv.id)
      .eq('user_id', otherUserId);

    if (!partError && participants && participants.length > 0) {
      // Conversation trouvée
      return { data: { id: conv.id, product_id: conv.product_id }, error: null };
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

// Récupérer toutes les conversations d'un utilisateur avec résumé
export async function getUserConversations(userId: string): Promise<{ data: ConversationSummary[] | null, error: any }> {
try {
// 1. Récupérer toutes les conversations de l'utilisateur
const { data: userConversations, error: convError } = await supabase
  .from('conversation_participants')
  .select(`
    conversation_id,
    conversations!inner(
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
  
  conversationSummaries.push({
    id: conv.conversations.id,
    product_id: conv.conversations.product_id,
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
return { data: null, error };
}
} src/lib/messageService.ts
import { supabase } from './supabase';

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
const { data: existingConversations, error: convError } = await supabase
  .from('conversations')
  .select(`
    id,
    product_id,
    conversation_participants!inner(user_id)
  `)
  .eq('product_id', productId)
  .eq('conversation_participants.user_id', userId);

if (convError) throw convError;

// 2. Vérifier si l'autre utilisateur fait partie d'une de ces conversations
if (existingConversations && existingConversations.length > 0) {
  for (const conv of existingConversations) {
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conv.id)
      .eq('user_id', otherUserId);

    if (!partError && participants && participants.length > 0) {
      // Conversation trouvée
      return { data: { id: conv.id, product_id: conv.product_id }, error: null };
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

// Récupérer toutes les conversations d'un utilisateur avec résumé
export async function getUserConversations(userId: string): Promise<{ data: ConversationSummary[] | null, error: any }> {
try {
// 1. Récupérer toutes les conversations de l'utilisateur
const { data: userConversations, error: convError } = await supabase
  .from('conversation_participants')
  .select(`
    conversation_id,
    conversations!inner(
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
  
  conversationSummaries.push({
    id: conv.conversations.id,
    product_id: conv.conversations.product_id,
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
return { data: null, error };
}
} src/lib/messageService.ts
import { supabase } from './supabase';

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
const { data: existingConversations, error: convError } = await supabase
  .from('conversations')
  .select(`
    id,
    product_id,
    conversation_participants!inner(user_id)
  `)
  .eq('product_id', productId)
  .eq('conversation_participants.user_id', userId);

if (convError) throw convError;

// 2. Vérifier si l'autre utilisateur fait partie d'une de ces conversations
if (existingConversations && existingConversations.length > 0) {
  for (const conv of existingConversations) {
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conv.id)
      .eq('user_id', otherUserId);

    if (!partError && participants && participants.length > 0) {
      // Conversation trouvée
      return { data: { id: conv.id, product_id: conv.product_id }, error: null };
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

// Récupérer toutes les conversations d'un utilisateur avec résumé
export async function getUserConversations(userId: string): Promise<{ data: ConversationSummary[] | null, error: any }> {
try {
// 1. Récupérer toutes les conversations de l'utilisateur
const { data: userConversations, error: convError } = await supabase
  .from('conversation_participants')
  .select(`
    conversation_id,
    conversations!inner(
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

//