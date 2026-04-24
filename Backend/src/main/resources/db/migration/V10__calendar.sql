CREATE TABLE IF NOT EXISTS calendar_events (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    event_date  DATE         NOT NULL,
    event_time  TIME,
    netid       VARCHAR(100) NOT NULL,
    event_type  VARCHAR(50)  NOT NULL DEFAULT 'PERSONAL',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_netid      ON calendar_events (netid);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date       ON calendar_events (event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_netid_date ON calendar_events (netid, event_date);
