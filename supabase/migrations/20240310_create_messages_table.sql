-- Create messages table
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    recipient_id UUID NOT NULL REFERENCES auth.users(id),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create function to get recent conversations
CREATE OR REPLACE FUNCTION get_recent_conversations(user_id UUID)
RETURNS TABLE (
    conversation_user_id UUID,
    email TEXT,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH conversations AS (
        SELECT DISTINCT
            CASE
                WHEN sender_id = user_id THEN recipient_id
                ELSE sender_id
            END as other_user_id,
            MAX(created_at) as last_message_time
        FROM messages
        WHERE sender_id = user_id OR recipient_id = user_id
        GROUP BY other_user_id
    )
    SELECT
        c.other_user_id as conversation_user_id,
        u.email,
        m.content as last_message,
        c.last_message_time,
        COUNT(CASE WHEN m2.read = FALSE AND m2.recipient_id = user_id THEN 1 END) as unread_count
    FROM conversations c
    JOIN auth.users u ON u.id = c.other_user_id
    JOIN messages m ON (
        (m.sender_id = user_id AND m.recipient_id = c.other_user_id) OR
        (m.sender_id = c.other_user_id AND m.recipient_id = user_id)
    ) AND m.created_at = c.last_message_time
    LEFT JOIN messages m2 ON m2.sender_id = c.other_user_id AND m2.recipient_id = user_id
    GROUP BY c.other_user_id, u.email, m.content, c.last_message_time
    ORDER BY c.last_message_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own messages"
    ON messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
    ON messages FOR UPDATE
    USING (auth.uid() = sender_id);

-- Create indexes
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at); 