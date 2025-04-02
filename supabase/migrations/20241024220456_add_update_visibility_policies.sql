-- Update policies for tables with relationships to workspaces

-- Assistants
DROP POLICY IF EXISTS "Allow view access to non-private assistants" ON assistants;

CREATE POLICY "Allow view access to public and link assistants" ON assistants FOR
SELECT USING (sharing in ('public', 'link'));

CREATE POLICY "Users can view non-private assistants in their workspaces" ON assistants FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.assistant_workspaces aw
            WHERE
                sharing <> 'private'
                AND aw.assistant_id = assistants.id
                AND is_workspace_member (aw.workspace_id, auth.uid ())
        )
    );

CREATE POLICY "Allow full access to non-private assistants in their workspaces" ON assistants FOR ALL
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.assistant_workspaces aw
            WHERE
                sharing <> 'private'
                AND aw.assistant_id = assistants.id
                AND is_workspace_member (aw.workspace_id, auth.uid ())
        )
    );

-- Chats

CREATE POLICY "Read access to the chats shared with the workspace" ON chats FOR
SELECT USING (
        sharing <> 'private'
        AND is_workspace_member (
            chats.workspace_id, auth.uid ()
        )
    );

CREATE POLICY "Full access to the chats shared with the workspace" ON chats FOR ALL
WITH
    CHECK (
        sharing <> 'private'
        AND is_workspace_member (
            chats.workspace_id,
            auth.uid ()
        )
    );

DROP POLICY "Allow view access to non-private chats" ON chats;

CREATE POLICY "Allow view access to public and link chats" ON chats FOR
SELECT USING (sharing in ('public', 'link'));

-- Collections
CREATE POLICY "Users can view collections in their workspaces" ON public.collections FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.collection_workspaces cw
            WHERE
                cw.collection_id = collections.id
                AND is_workspace_member (cw.workspace_id, auth.uid ())
        )
    );
-- Files

DROP POLICY "Allow view access to non-private files" ON files;

CREATE POLICY "Allow view access to public and link files" ON files FOR
SELECT USING (sharing in ('public', 'link'));

CREATE POLICY "Users can view non-private files in their workspaces" ON public.files FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.file_workspaces fw
            WHERE
                sharing <> 'private'
                AND fw.file_id = files.id
                AND is_workspace_member (fw.workspace_id, auth.uid ())
        )
    );

CREATE POLICY "Users can view files in their workspaces" ON public.files FOR ALL
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.file_workspaces fw
            WHERE
                sharing <> 'private'
                AND fw.file_id = files.id
                AND is_workspace_member (fw.workspace_id, auth.uid ())
        )
    );

-- Folders
CREATE POLICY "Users can view folders in their workspaces" ON public.folders FOR
SELECT USING (
        is_workspace_member (
            folders.workspace_id, auth.uid ()
        )
    );

-- Models
CREATE POLICY "Users can view models in their workspaces" ON public.models FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.model_workspaces mw
            WHERE
                mw.model_id = models.id
                AND is_workspace_member (mw.workspace_id, auth.uid ())
        )
    );

-- Presets
CREATE POLICY "Users can view presets in their workspaces" ON public.presets FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.preset_workspaces pw
            WHERE
                pw.preset_id = presets.id
                AND is_workspace_member (pw.workspace_id, auth.uid ())
        )
    );

-- Prompts

DROP POLICY "Allow view access to non-private prompts" ON prompts;

CREATE POLICY "Users can view non-private prompts in their workspaces" ON public.prompts FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.prompt_workspaces pw
            WHERE
                sharing <> 'private'
                AND pw.prompt_id = prompts.id
                AND is_workspace_member (pw.workspace_id, auth.uid ())
        )
    );

CREATE POLICY "Allow full access to non-private prompts in their workspaces" ON prompts FOR ALL
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.prompt_workspaces pw
            WHERE
                sharing <> 'private'
                AND pw.prompt_id = prompts.id
                AND is_workspace_member (pw.workspace_id, auth.uid ())
        )
    );

CREATE POLICY "Allow view access to public and link prompts" ON prompts FOR
SELECT USING (sharing in ('public', 'link'));

-- Tools

DROP POLICY "Allow view access to non-private tools" ON tools;

CREATE POLICY "Allow view access to public and link tools" ON tools FOR
SELECT USING (sharing in ('public', 'link'));

CREATE POLICY "Users can view non-private tools in their workspaces" ON tools FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.tool_workspaces tw
            WHERE
                sharing <> 'private'
                AND tw.tool_id = tools.id
                AND is_workspace_member (tw.workspace_id, auth.uid ())
        )
    );

CREATE POLICY "Allow full access to non-private tools in their workspaces" ON tools FOR ALL
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

-- Messages (related to chats)

DROP POLICY IF EXISTS "Users can create messages" ON public.messages;

DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;

DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;

CREATE POLICY "Users can view messages in their workspace chats" ON public.messages FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.chats c
            WHERE
                c.id = messages.chat_id
                AND is_workspace_member (c.workspace_id, auth.uid ())
        )
    );

-- File items (related to files)
CREATE POLICY "Users can view file items in their workspace files" ON public.file_items FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.files f
                JOIN public.file_workspaces fw ON f.id = fw.file_id
            WHERE
                f.id = file_items.file_id
                AND is_workspace_member (fw.workspace_id, auth.uid ())
        )
    );
-- Applications

CREATE POLICY "Users can view applications in their workspaces" ON applications FOR
SELECT USING (
        is_workspace_member (
            applications.workspace_id, auth.uid ()
        )
    );

CREATE POLICY "Allow read access to members of a workspace" ON assistant_workspaces FOR
SELECT USING (
        is_workspace_member (
            assistant_workspaces.workspace_id, auth.uid ()
        )
    );

CREATE POLICY "Allow read access to members of a workspace" ON file_workspaces FOR
SELECT USING (
        is_workspace_member (
            file_workspaces.workspace_id, auth.uid ()
        )
    );

CREATE POLICY "Allow read access to members of a workspace" ON tool_workspaces FOR
SELECT USING (
        is_workspace_member (
            tool_workspaces.workspace_id, auth.uid ()
        )
    );

CREATE POLICY "Allow read access to members of a workspace" ON prompt_workspaces FOR
SELECT USING (
        is_workspace_member (
            prompt_workspaces.workspace_id, auth.uid ()
        )
    );

CREATE POLICY "Allow read access to workspace members" ON workspaces FOR
SELECT USING (
        is_workspace_member (workspaces.id, auth.uid ())
    );

-- any authenticated can create a workspace

DROP POLICY "Allow full access to own workspaces" ON workspaces;

CREATE POLICY "Allow all permissions to owners" ON workspaces FOR ALL USING (
    user_id = auth.uid ()
    OR is_workspace_member (workspaces.id, auth.uid ())
)
WITH
    CHECK (
        user_id = auth.uid ()
        OR is_workspace_member (
            workspaces.id,
            auth.uid (),
            'OWNER'
        )
    );