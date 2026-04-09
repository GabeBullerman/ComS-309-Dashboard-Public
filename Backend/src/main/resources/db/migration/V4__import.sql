alter table if exists users
    alter column password drop not null
    add initials varchar(255)