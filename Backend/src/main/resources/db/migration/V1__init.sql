CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    netid VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE permissions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE user_role (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_role_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_user_role_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE role_permission (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permission_role
        FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_role_permission_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE tas (
    netid VARCHAR(64) PRIMARY KEY,
    tasks INT
);

CREATE TABLE head_ta (
    netid VARCHAR(64) PRIMARY KEY,
    CONSTRAINT fk_head_ta_ta
        FOREIGN KEY (netid) REFERENCES tas(netid)
);

CREATE TABLE professor (
    netid VARCHAR(64) PRIMARY KEY
);

CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    ta_netid VARCHAR(64) NOT NULL,
    CONSTRAINT fk_tasks_ta
        FOREIGN KEY (ta_netid) REFERENCES tas(netid)
);

CREATE TABLE files (
    id BIGSERIAL PRIMARY KEY,
    data BYTEA NOT NULL,
    task_id BIGINT NOT NULL,
    CONSTRAINT fk_files_task
        FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE teams (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    section INT,
    ta VARCHAR(64),
    status INT,
    ta_notes VARCHAR(1024),
    gitlab VARCHAR(255),
    CONSTRAINT fk_teams_ta
        FOREIGN KEY (ta) REFERENCES tas(netid)
);

CREATE TABLE students (
    netid VARCHAR(64) PRIMARY KEY,
    team_id BIGINT,
    section INT,
    CONSTRAINT fk_students_team
        FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX idx_tasks_ta_netid ON tasks(ta_netid);
CREATE INDEX idx_teams_ta ON teams(ta);
CREATE INDEX idx_students_team_id ON students(team_id);
CREATE INDEX idx_user_role_user ON user_role(user_id);
CREATE INDEX idx_user_role_role ON user_role(role_id);
CREATE INDEX idx_role_permission_role ON role_permission(role_id);
CREATE INDEX idx_role_permission_permission ON role_permission(permission_id);
