CREATE TABLE announcements (
    id            BIGSERIAL PRIMARY KEY,
    message       TEXT        NOT NULL,
    created_by_netid VARCHAR(64) NOT NULL,
    created_by_name  VARCHAR(128),
    created_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE
);
