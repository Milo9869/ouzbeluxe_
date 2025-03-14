-- supabase/migrations/20250312000000_add_user_search.sql

/*
  Procédures et fonctions pour améliorer la recherche d'utilisateurs
  et les fonctionnalités de messagerie
*/

-- Fonction pour rechercher des utilisateurs par nom ou email
CREATE OR REPLACE FUNCTION search_users(search_query TEXT, current_user_id UUID)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    a.email,
    p.full_name,
    p.avatar_url
  FROM
    profiles p
  JOIN
    auth.users a ON p.id = a.id
  WHERE
    (p.username ILIKE '%' || search_query || '%' OR
     a.email ILIKE '%' || search_query || '%' OR
     p.full_name ILIKE '%' || search_query || '%')
    AND p.id != current_user_id
  LIMIT 20;
END;
$$;

-- Fonction pour récupérer le nombre total de messages non lus pour un utilisateur
CREATE OR REPLACE FUNCTION get_unread_messages_count(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO count_result
  FROM messages m
  JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
  WHERE cp.user_id = user_id
    AND m.read = FALSE
    AND m.sender_id != user_id;
  
  RETURN count_result;
END;
$$;

-- Vue pour faciliter la récupération des conversations avec leur dernier message
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT
  c.id AS conversation_id,
  c.product_id,
  c.updated_at,
  cp.user_id AS participant_id,
  (
    SELECT m.id
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message_id
FROM
  conversations c
JOIN
  conversation_participants cp ON c.id = cp.conversation_id;

-- Fonction pour obtenir les conversations d'un utilisateur avec les informations essentielles
CREATE OR REPLACE FUNCTION get_user_conversations(user_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  product_id UUID,
  updated_at TIMESTAMPTZ,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  last_message_sender_id UUID,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_conversations AS (
    SELECT
      c.conversation_id,
      c.product_id,
      c.updated_at,
      c.last_message_id
    FROM
      conversation_summaries c
    WHERE
      c.participant_id = user_id
  ),
  other_participants AS (
    SELECT
      uc.conversation_id,
      uc.product_id,
      uc.updated_at,
      uc.last_message_id,
      cp.user_id AS other_user_id
    FROM
      user_conversations uc
    JOIN
      conversation_participants cp ON uc.conversation_id = cp.conversation_id
    WHERE
      cp.user_id != user_id
  )
  SELECT
    op.conversation_id,
    op.product_id,
    op.updated_at,
    op.other_user_id,
    p.full_name AS other_user_name,
    p.avatar_url AS other_user_avatar,
    m.content AS last_message,
    m.created_at AS last_message_time,
    m.sender_id AS last_message_sender_id,
    (
      SELECT COUNT(*)
      FROM messages
      WHERE conversation_id = op.conversation_id
        AND read = FALSE
        AND sender_id != user_id
    ) AS unread_count
  FROM
    other_participants op
  LEFT JOIN
    profiles p ON op.other_user_id = p.id
  LEFT JOIN
    messages m ON op.last_message_id = m.id
  ORDER BY
    op.updated_at DESC;
END;
$$;