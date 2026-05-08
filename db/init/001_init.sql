CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL,

    title VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,

    session_id UUID NOT NULL
        REFERENCES chat_sessions(id)
        ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL
        CHECK (role IN ('user', 'assistant')),

    content TEXT NOT NULL,

    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session
ON chat_messages(session_id, created_at);

CREATE TABLE chat_attachments (
    id BIGSERIAL PRIMARY KEY,

    session_id UUID NOT NULL
        REFERENCES chat_sessions(id)
        ON DELETE CASCADE,

    message_id BIGINT NULL
        REFERENCES chat_messages(id)
        ON DELETE CASCADE,

    user_id BIGINT NOT NULL,

    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,

    file_type VARCHAR(100) NOT NULL, -- pdf, image/png, docx, etc.
    mime_type VARCHAR(255) NOT NULL,

    file_size BIGINT NOT NULL, -- bytes

    storage_disk VARCHAR(50) DEFAULT 's3',
    file_path TEXT NOT NULL,

    extracted_text TEXT NULL, -- OCR / parsed text for AI context

    metadata JSONB NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_attachments_session
ON chat_attachments(session_id);

CREATE INDEX idx_chat_attachments_message
ON chat_attachments(message_id);

CREATE INDEX idx_chat_attachments_user
ON chat_attachments(user_id);