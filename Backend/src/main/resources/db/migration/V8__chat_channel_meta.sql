CREATE TABLE IF NOT EXISTS chat_channels (
    id           VARCHAR(255) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    description  TEXT
);
INSERT INTO chat_channels (id, display_name, description)
VALUES
    ('general',         'General',         NULL),
    ('system-feedback', 'System Feedback', 'Report bugs, suggest improvements, or discuss feature requests')
ON CONFLICT (id) DO NOTHING;
