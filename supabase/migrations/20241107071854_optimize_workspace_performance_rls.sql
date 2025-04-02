-- POLICIES --

-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

DROP POLICY "Allow all permissions to owners" ON workspaces;

CREATE POLICY "Allow all permissions to owners" ON workspaces FOR ALL to authenticated USING (
    user_id = (
        select auth.uid ()
    )
    OR (
        select is_workspace_member (
                workspaces.id, (
                    select auth.uid ()
                )
            )
    )
)
WITH
    CHECK (
        user_id = (
            select auth.uid ()
        )
        OR (
            select is_workspace_member (
                    workspaces.id, (
                        select auth.uid ()
                    ), 'OWNER'
                )
        )
    );

DROP POLICY "Allow read access to workspace members" ON workspaces;

CREATE POLICY "Allow read access to workspace members" ON workspaces FOR
SELECT TO authenticated USING (
        (
            select is_workspace_member (workspaces.id, auth.uid ())
        )
    );