-- Chat Conversations (channels + DM threads)
CREATE TABLE IF NOT EXISTS chat_conversations (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type         varchar(20) NOT NULL CHECK (type IN ('channel', 'direct')),
  name         varchar(100),
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamp DEFAULT now()
);

-- Chat Members (participants + unread tracking)
CREATE TABLE IF NOT EXISTS chat_members (
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at       timestamp DEFAULT now(),
  last_read_at    timestamp DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         text NOT NULL,
  created_at      timestamp DEFAULT now(),
  updated_at      timestamp,
  deleted_at      timestamp
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_user  ON chat_members(user_id);
