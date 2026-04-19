ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255) NOT NULL DEFAULT 'general';

-- chat_reads PK changed from netid→id(netid:channel). Run manually if table already exists.
DROP TABLE IF EXISTS chat_reads;
CREATE TABLE chat_reads (
    id              VARCHAR(512) PRIMARY KEY,  -- "netid:channelName"
    netid           VARCHAR(255) NOT NULL,
    channel_name    VARCHAR(255) NOT NULL,
    last_read_message_id BIGINT
);
