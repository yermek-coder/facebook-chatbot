CREATE TABLE IF NOT EXISTS public.whatsapp_users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    sender VARCHAR(255) NOT NULL REFERENCES whatsapp_users(id),
    recipient VARCHAR(255) NOT NULL REFERENCES whatsapp_users(id),
    text TEXT,
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender ON whatsapp_messages(sender);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient ON whatsapp_messages(recipient);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_phone ON whatsapp_users(phone);