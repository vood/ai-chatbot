begin;

create extension if not exists pg_hashids;

create sequence if not exists chats_num_id_seq;

create sequence if not exists prompts_num_id_seq;

create sequence if not exists assistants_num_id_seq;

alter table public.chats
add column hashid text unique not null default id_encode (nextval('chats_num_id_seq'));

alter table public.prompts
add column hashid text unique not null default id_encode (nextval('prompts_num_id_seq'));

alter table public.assistants
add column hashid text unique not null default id_encode (
    nextval('assistants_num_id_seq')
);

commit;