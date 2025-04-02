BEGIN;

SELECT tests.init_users ();

-- Plan the tests
SELECT plan (22);

-- Create a test tool and associate it with a workspace
CREATE OR REPLACE FUNCTION tests.create_test_tool(workspace_id uuid, sharing text) RETURNS uuid AS $$
DECLARE
    tool_id uuid;
BEGIN
    INSERT INTO tools (
        name, user_id, sharing, description, url, schema, custom_headers, can_be_used_in_applications
    )
    VALUES (
        'Test tool',
        (SELECT id FROM auth.users WHERE email = 'test_owner@example.com'),
        sharing,
        'Test tool description',
        'https://api.example.com/test-tool',
        '{"type": "object", "properties": {}}',
        '{"Authorization": "Bearer test_token"}',
        true
    )
    RETURNING id INTO tool_id;

    
    INSERT INTO tool_workspaces (workspace_id, tool_id, user_id)
    VALUES (workspace_id, tool_id, (SELECT id FROM auth.users WHERE email = 'test_owner@example.com'));
    
    RETURN tool_id;
END;
$$ LANGUAGE plpgsql;

-- Set up test data
DO $$
DECLARE
    private_tool_id uuid;
    workspace_tool_id uuid;
    public_tool_id uuid;
BEGIN
    SELECT tests.create_test_tool(tests.get_test_workspace_id(), 'private') INTO private_tool_id;
    SELECT tests.create_test_tool(tests.get_test_workspace_id(), 'workspace') INTO workspace_tool_id;
    SELECT tests.create_test_tool(tests.get_test_workspace_id(), 'public') INTO public_tool_id;
END $$;

-- Test 1: Owner can select all their tools
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM tools p JOIN tool_workspaces pw ON p.id = pw.tool_id WHERE pw.workspace_id = tests.get_test_workspace_id()', ARRAY[3::bigint], 'Workspace owner can select all their tools'
    );

-- Test 2: Owner can update their private tool
SELECT lives_ok (
        $$UPDATE tools SET name = 'Updated Private tool' WHERE id IN (SELECT tool_id FROM tool_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'private'$$, 'Workspace owner can update their private tool'
    );

-- Test 3: Member can select workspace and public tools
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM tools p WHERE p.sharing IN (''workspace'', ''public'')', ARRAY[2::bigint], 'Workspace member can select workspace and public tools'
    );

-- Test 4: Member cannot select private tool
SELECT results_eq (
        'SELECT count(*) FROM tools p JOIN tool_workspaces pw ON p.id = pw.tool_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''private''', ARRAY[0::bigint], 'Workspace member cannot select private tool'
    );

-- Test 5: Member can update workspace tool
SELECT lives_ok (
        $$UPDATE tools SET name = 'Updated Workspace tool' WHERE id IN (SELECT tool_id FROM tool_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace'$$, 'Workspace member can update workspace tool'
    );

-- Test 6: Member can update public tool in their workspace
SELECT lives_ok (
        $$UPDATE tools SET name = 'Updated Public tool' WHERE id IN (SELECT tool_id FROM tool_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public'$$, 'Workspace member can update public tool in their workspace'
    );

-- Test 7: Non-member can only select public tool
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM tools p WHERE p.sharing = ''public''', ARRAY[1::bigint], 'Non-member can only select public tool'
    );

-- Test 8: Owner can insert a new private tool
SELECT tests.authenticate_as ('test_owner');

SELECT lives_ok (
        $$
    WITH new_tool AS (
        INSERT INTO tools (name, user_id, sharing, description, url, schema, custom_headers, can_be_used_in_applications)
        VALUES ('New Private tool', (tests.get_supabase_user('test_owner')->> 'id')::uuid, 'private', 'Test tool description', 'https://api.example.com/new-private-tool', '{"type": "object", "properties": {}}', '{"Authorization": "Bearer test_token"}', true)
        RETURNING id
    )
    INSERT INTO tool_workspaces (workspace_id, tool_id, user_id)
    SELECT tests.get_test_workspace_id(), id, ( tests.get_supabase_user ('test_owner') ->> 'id' )::uuid FROM new_tool
    $$, 'Workspace owner can insert a new private tool'
    );

-- Test 9: Member can insert a new workspace tool
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$
    WITH new_tool AS (
        INSERT INTO tools (name, user_id, sharing, description, url, schema, custom_headers, can_be_used_in_applications)
        VALUES ('New Workspace tool', (tests.get_supabase_user('test_member')->> 'id')::uuid, 'workspace', 'Test tool description', 'https://api.example.com/new-workspace-tool', '{"type": "object", "properties": {}}', '{"Authorization": "Bearer test_token"}', true)
        RETURNING id
    )
    INSERT INTO tool_workspaces (workspace_id, tool_id, user_id)
    SELECT tests.get_test_workspace_id(), id, ( tests.get_supabase_user ('test_member') ->> 'id' )::uuid FROM new_tool
    $$, 'Workspace member can insert a new workspace tool'
    );

-- Test 10: Member can insert a new public tool
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$
    WITH new_tool AS (
        INSERT INTO tools (name, user_id, sharing, description, url, schema, custom_headers, can_be_used_in_applications)
        VALUES ('New Public tool', (tests.get_supabase_user('test_member')->> 'id')::uuid, 'public', 'Test tool description', 'https://api.example.com/new-public-tool', '{"type": "object", "properties": {}}', '{"Authorization": "Bearer test_token"}', true)
        RETURNING id
    )
    INSERT INTO tool_workspaces (workspace_id, tool_id, user_id)
    SELECT tests.get_test_workspace_id(), id, (tests.get_supabase_user('test_member')->> 'id')::uuid FROM new_tool
    $$, 'Workspace member can insert a new public tool'
    );

-- Test 11: Verify the newly inserted public tool is visible to non-members
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM tools p WHERE p.sharing = ''public''', ARRAY[2::bigint], 'Non-member can see the newly inserted public tool'
    );

-- Test 12: Owner can delete their private tool
SELECT tests.authenticate_as ('test_owner');

SELECT lives_ok (
        $$DELETE FROM tools WHERE id IN (SELECT tool_id FROM tool_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'private'$$, 'Workspace owner can delete their private tool'
    );

-- Test 13: Member can delete workspace tool
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$DELETE FROM tools WHERE id IN (SELECT tool_id FROM tool_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace'$$, 'Workspace member can delete workspace tool'
    );

-- Test 14: Member can delete public tool in their workspace
SELECT lives_ok (
        $$DELETE FROM tools WHERE id IN (SELECT tool_id FROM tool_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public'$$, 'Workspace member can delete public tool in their workspace'
    );

-- Test 15: Verify public tool visibility for non-members
SELECT tests.authenticate_as ('test_non_member');

SELECT isnt_empty (
        'SELECT count(*) FROM tools p JOIN tool_workspaces pw ON p.id = pw.tool_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''public''', 'Non-member can see public tool'
    );

-- Test 16: Non-member cannot update public tool
SELECT is_empty (
        $$UPDATE tools SET name = 'Unauthorized Update' WHERE id IN (SELECT tool_id FROM tool_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public' RETURNING name$$, 'Non-member cannot update public tool'
    );

-- Test 17: Non-member cannot delete public tool
SELECT is_empty (
        $$DELETE FROM tools WHERE id IN (SELECT tool_id FROM tool_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public' RETURNING name$$, 'Non-member cannot delete public tool'
    );

-- Test 18: Workspace owner cannot see private tools of other users
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM tools p JOIN tool_workspaces pw ON p.id = pw.tool_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''private'' AND p.user_id != (tests.get_supabase_user(''test_owner'')->> ''id'')::uuid', ARRAY[0::bigint], 'Workspace owner cannot see private tools of other users'
    );

-- Test 19: Workspace owner can see and update workspace and public tools
SELECT results_eq (
        'SELECT count(*) FROM tools p JOIN tool_workspaces pw ON p.id = pw.tool_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing IN (''workspace'', ''public'')', ARRAY[2::bigint], 'Workspace owner can select workspace and public tools'
    );

-- Test 20: Non-member cannot see or update workspace tools
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM tools p JOIN tool_workspaces pw ON p.id = pw.tool_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''workspace''', ARRAY[0::bigint], 'Non-member cannot see workspace tools'
    );

SELECT is_empty (
        $$UPDATE tools SET name = 'Unauthorized Update' WHERE id IN (SELECT tool_id FROM tool_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace' RETURNING name$$, 'Non-member cannot update workspace tools'
    );

-- Test 21: Workspace member cannot select private tool they didn't create
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM tools p JOIN tool_workspaces pw ON p.id = pw.tool_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''private'' AND p.user_id != (tests.get_supabase_user(''test_member'')->> ''id'')::uuid', ARRAY[0::bigint], 'Workspace member cannot select private tool they didn''t create'
    );

-- Finish the tests and clean up
SELECT * FROM finish ();

ROLLBACK;