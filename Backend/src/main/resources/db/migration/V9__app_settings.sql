CREATE TABLE IF NOT EXISTS app_settings (
    id       BIGSERIAL PRIMARY KEY,
    key_name VARCHAR(255) NOT NULL UNIQUE,
    value    TEXT
);

INSERT INTO app_settings (key_name, value)
VALUES ('semester_start_date', NULL)
ON CONFLICT (key_name) DO NOTHING;
