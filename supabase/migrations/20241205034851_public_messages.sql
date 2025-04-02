create table public_chat_messages (
  id uuid primary key default gen_random_uuid(),
  input_message text not null,
  output_message text not null,
  model text not null,
  referrer text not null,
  application_id uuid null references applications(id),
  file_id uuid null references files(id),
  created_at timestamp with time zone not null default now()
);

-- Add indexes
create index public_chat_messages_created_at_idx on public_chat_messages(created_at);
create index public_chat_messages_referrer_idx on public_chat_messages(referrer);

-- Enable Row Level Security
alter table public_chat_messages enable row level security;

-- Create policy for admin users only
create policy "Admin users can read public chat messages"
  on public_chat_messages
  for select
  to service_role;

create policy "Admin users can insert public chat messages"
  on public_chat_messages
  for insert
  to service_role;

-- Revoke access from public
revoke all on public_chat_messages from anon, authenticated;

-- Grant access to authenticated users (will be filtered by RLS policies)
grant select, insert on public_chat_messages to service_role;