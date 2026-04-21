CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    sender_netid VARCHAR(255) NOT NULL,
    sender_name  VARCHAR(255),
    content      TEXT NOT NULL,
    reply_to_id  BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
    edited       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP
);

CREATE TABLE chat_mentions (
    id              BIGSERIAL PRIMARY KEY,
    message_id      BIGINT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    mentioned_netid VARCHAR(255),
    mentioned_role  VARCHAR(50)
);

CREATE TABLE chat_reads (
    netid               VARCHAR(255) PRIMARY KEY,
    last_read_message_id BIGINT
);
