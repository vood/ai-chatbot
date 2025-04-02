-- Create the auth hook function
create or replace function public.workspace_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security invoker
stable
as $$
declare
    claims jsonb;
    user_workspaces jsonb;
    current_workspace_id uuid;
begin
    -- Fetch the user's workspaces and roles
    select 
        jsonb_agg(
            jsonb_build_object(
                'workspace_id', wu.workspace_id,
                'role', wu.role,
                'status', wu.status
            )
        ) into user_workspaces
    from public.workspace_users wu
    where wu.user_id = (event->>'user_id')::uuid;

    -- Get current workspace from workspace_users or default to home workspace
    select 
        coalesce(
            (
                select wu.workspace_id
                from public.workspace_users wu
                where wu.user_id = (event->>'user_id')::uuid
                and wu.is_current = true
                limit 1
            ),
            (
                select w.id 
                from public.workspaces w 
                where w.user_id = (event->>'user_id')::uuid 
                and w.is_home = true 
                limit 1
            )
        ) into current_workspace_id;

    claims := event->'claims';

    if user_workspaces is not null then
        claims := jsonb_set(claims, '{workspaces}', user_workspaces);
    else
        claims := jsonb_set(claims, '{workspaces}', '[]'::jsonb);
    end if;

    -- Add current workspace to claims
    if current_workspace_id is not null then
        claims := jsonb_set(claims, '{current_workspace}', to_jsonb(current_workspace_id));
    end if;

    event := jsonb_set(event, '{claims}', claims);

    return event;
end;
$$;

-- Function to get current workspace ID
create or replace function wid()
returns uuid
language sql
stable
as $$
    select ((auth.jwt()->>'current_workspace')::text)::uuid;
$$;

-- Function to update current workspace ID
create or replace function update_wid(new_workspace_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
    -- Check if user is member of the workspace
    if not is_workspace_member(new_workspace_id, auth.uid()) then
        raise exception 'User is not a member of this workspace';
    end if;

    -- Update current workspace
    update workspace_users 
    set is_current = false 
    where user_id = auth.uid() 
    and is_current = true;

    update workspace_users 
    set is_current = true 
    where user_id = auth.uid() 
    and workspace_id = new_workspace_id;
    return true;
end;
$$;

-- Grant necessary permissions
grant usage on schema public to supabase_auth_admin;

grant
execute on function public.workspace_access_token_hook to supabase_auth_admin;

revoke
execute on function public.workspace_access_token_hook
from authenticated, anon, public;

grant all on table public.workspaces to supabase_auth_admin;

grant all on table public.workspace_users to supabase_auth_admin;

-- Create policies for auth admin
create policy "Allow auth admin to read workspaces" on public.workspaces as permissive for
select to supabase_auth_admin using (true);

create policy "Allow auth admin to read workspace users" on public.workspace_users as permissive for
select to supabase_auth_admin using (true);

-- Grant permissions for the new functions
grant execute on function public.wid to authenticated;

grant execute on function public.update_wid to authenticated;

-- Add is_current column to workspace_users
alter table workspace_users
add column is_current boolean default false;

-- Update existing workspaces to set home workspace as current
update workspace_users wu
set
    is_current = is_home
from workspaces w
where
    w.id = wu.workspace_id;

create unique index workspace_users_user_id_is_current_idx on workspace_users (user_id, is_current)
where
    is_current = true;
-- this is to ensure only one current workspace per user