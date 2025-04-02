
DROP POLICY IF EXISTS "Allow full access to non-private tools in their workspaces" ON tools;
CREATE POLICY "Allow full access to non-private tools in their workspaces" ON tools FOR ALL
USING(
    EXISTS (
            SELECT 1
            FROM public.tool_workspaces tw
            WHERE
                sharing <> 'private'
                AND tw.tool_id = tools.id
                AND is_workspace_member (tw.workspace_id, auth.uid ())
        )
)
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.tool_workspaces tw
            WHERE
                sharing <> 'private'
                AND tw.tool_id = tools.id
                AND is_workspace_member (tw.workspace_id, auth.uid ())
        )
    );