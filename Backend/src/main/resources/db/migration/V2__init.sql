create table files (
    id bigint not null,
    task_id bigint not null,
    data bytea not null,
    primary key (id)
);

create table permissions (
    id bigint not null,
    name varchar(255) not null unique,
    primary key (id)
);

create table refresh_tokens (
    revoked boolean,
    used boolean,
    created_at timestamp(6) not null,
    expires_at timestamp(6) not null,
    user_id bigint not null,
    id uuid not null,
    token_hash varchar(512) not null,
    primary key (id)
);

create table role_permissions (
    permission_id bigint not null,
    role_id bigint not null,
    primary key (permission_id, role_id)
);

create table roles (
    id bigint not null,
    role_name varchar(255) not null unique,
    primary key (id)
);

create table tasks (
    assigned_by bigint,
    assigned_date timestamp(6),
    assigned_to bigint,
    due_date timestamp(6),
    id bigint not null,
    description varchar(255),
    title varchar(255) not null,
    primary key (id)
);

create table teams (
    section integer,
    status integer,
    id bigint not null,
    ta_id bigint,
    gitlab varchar(255),
    name varchar(255) not null,
    ta_notes varchar(255),
    primary key (id)
);

create table user_roles (
    role_id bigint not null,
    user_id bigint not null,
    primary key (role_id, user_id)
);

create table users (
    id bigint not null,
    team_id bigint,
    name varchar(255) not null,
    netid varchar(255) not null unique,
    password varchar(255) not null,
    contributions INTEGER NOT NULL DEFAULT 0,
    primary key (id)
);

alter table if exists refresh_tokens
   add constraint fk_refresh_token_user
   foreign key (user_id)
   references users;

alter table if exists role_permissions
   add constraint fk_role_permissions_permissions
   foreign key (permission_id)
   references permissions;

alter table if exists role_permissions
   add constraint fk_role_permissions_roles
   foreign key (role_id)
   references roles;

alter table if exists tasks
   add constraint fk_tasks_assigned_by
   foreign key (assigned_by)
   references users;

alter table if exists tasks
   add constraint fk_tasks_assigned_to
   foreign key (assigned_to)
   references users;

alter table if exists teams
   add constraint fk_teams_ta
   foreign key (ta_id)
   references users;

alter table if exists user_roles
   add constraint fk_user_roles_roles
   foreign key (role_id)
   references roles;

alter table if exists user_roles
   add constraint fk_user_roles_users
   foreign key (user_id)
   references users;

alter table if exists users
   add constraint fk_student_teams
   foreign key (team_id)
   references teams;
