/*
  # Système de messagerie

  1. Nouvelles Tables
    - `conversations`
      - `id` (uuid, clé primaire)
      - `product_id` (uuid, référence au produit concerné)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `conversation_participants`
      - `conversation_id` (uuid, référence à conversations)
      - `user_id` (uuid, référence à auth.users)
      - `created_at` (timestamp)

    - `messages`
      - `id` (uuid, clé primaire)
      - `conversation_id` (uuid, référence à conversations)
      - `sender_id` (uuid, référence à auth.users)
      - `content` (text)
      - `read` (boolean)
      - `created_at` (timestamp)

  2. Sécurité
    - Active RLS sur toutes les tables
    - Ajoute des politiques pour la lecture et l'écriture
*/

-- Table des conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des participants aux conversations
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Politiques pour les conversations
CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );

-- Politiques pour les participants
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Politiques pour les messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Fonction pour mettre à jour le timestamp des conversations
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le timestamp des conversations
CREATE TRIGGER update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

  -- Ajout du statut de message pour les offres ou négociations
ALTER TABLE messages ADD COLUMN message_type VARCHAR(50) DEFAULT 'text';
ALTER TABLE messages ADD COLUMN offer_amount DECIMAL(10, 2);
ALTER TABLE messages ADD COLUMN offer_status VARCHAR(50);

-- Création d'une vue pour faciliter l'affichage des conversations avec produits
CREATE OR REPLACE VIEW conversation_with_product AS
SELECT 
  c.id as conversation_id,
  c.product_id,
  p.title as product_title,
  p.price as product_price,
  p.image_url as product_image,
  c.created_at,
  c.updated_at
FROM 
  conversations c
JOIN 
  products p ON c.product_id = p.id;