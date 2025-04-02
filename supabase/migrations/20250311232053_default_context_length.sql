alter table workspaces
alter column default_context_length set not null,
alter column default_context_length set default 32000;


