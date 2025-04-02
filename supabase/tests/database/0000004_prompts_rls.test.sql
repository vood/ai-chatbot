BEGIN;

SELECT tests.init_users ();

-- Plan the tests
SELECT plan (22);

-- Create a test prompt and associate it with a workspace
CREATE OR REPLACE FUNCTION tests.create_test_prompt(workspace_id uuid, sharing text) RETURNS uuid AS $$
DECLARE
    prompt_id uuid;
BEGIN
    INSERT INTO prompts (
        name, user_id, content, sharing
    )
    VALUES (
        'Test Prompt',
        (SELECT id FROM auth.users WHERE email = 'test_owner@example.com'),
        'This is a test prompt content',
        sharing
    )
    RETURNING id INTO prompt_id;

    -- Associate the prompt with the workspace
    INSERT INTO prompt_workspaces (workspace_id, prompt_id, user_id)
    VALUES (workspace_id, prompt_id, (SELECT id FROM auth.users WHERE email = 'test_owner@example.com'));
    
    RETURN prompt_id;
END;
$$ LANGUAGE plpgsql;

-- Set up test data
DO $$
DECLARE
    private_prompt_id uuid;
    workspace_prompt_id uuid;
    public_prompt_id uuid;
BEGIN
    SELECT tests.create_test_prompt(tests.get_test_workspace_id(), 'private') INTO private_prompt_id;
    SELECT tests.create_test_prompt(tests.get_test_workspace_id(), 'workspace') INTO workspace_prompt_id;
    SELECT tests.create_test_prompt(tests.get_test_workspace_id(), 'public') INTO public_prompt_id;
END $$;

-- Test 1: Owner can select all their prompts
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM prompts p JOIN prompt_workspaces pw ON p.id = pw.prompt_id WHERE pw.workspace_id = tests.get_test_workspace_id()', ARRAY[3::bigint], 'Workspace owner can select all their prompts'
    );

-- Test 2: Owner can update their private prompt
SELECT lives_ok (
        $$UPDATE prompts SET name = 'Updated Private Prompt' WHERE id IN (SELECT prompt_id FROM prompt_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'private'$$, 'Workspace owner can update their private prompt'
    );

-- Test 3: Member can select workspace and public prompts
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM prompts p WHERE p.sharing IN (''workspace'', ''public'')', ARRAY[2::bigint], 'Workspace member can select workspace and public prompts'
    );

-- Test 4: Member cannot select private prompt
SELECT results_eq (
        'SELECT count(*) FROM prompts p JOIN prompt_workspaces pw ON p.id = pw.prompt_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''private''', ARRAY[0::bigint], 'Workspace member cannot select private prompt'
    );

-- Test 5: Member can update workspace prompt
SELECT lives_ok (
        $$UPDATE prompts SET name = 'Updated Workspace Prompt' WHERE id IN (SELECT prompt_id FROM prompt_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace'$$, 'Workspace member can update workspace prompt'
    );

-- Test 6: Member can update public prompt in their workspace
SELECT lives_ok (
        $$UPDATE prompts SET name = 'Updated Public Prompt' WHERE id IN (SELECT prompt_id FROM prompt_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public'$$, 'Workspace member can update public prompt in their workspace'
    );

-- Test 7: Non-member can only select public prompt
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM prompts p WHERE p.sharing = ''public''', ARRAY[1::bigint], 'Non-member can only select public prompt'
    );

-- Test 8: Owner can insert a new private prompt
SELECT tests.authenticate_as ('test_owner');

SELECT lives_ok (
        $$
    WITH new_prompt AS (
        INSERT INTO prompts (name, user_id, content, sharing)
        VALUES ('New Private Prompt', (tests.get_supabase_user('test_owner')->> 'id')::uuid, 'New private prompt content', 'private')
        RETURNING id
    )
    INSERT INTO prompt_workspaces (workspace_id, prompt_id, user_id)
    SELECT tests.get_test_workspace_id(), id, ( tests.get_supabase_user ('test_owner') ->> 'id' )::uuid FROM new_prompt
    $$, 'Workspace owner can insert a new private prompt'
    );

-- Test 9: Member can insert a new workspace prompt
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$
    WITH new_prompt AS (
        INSERT INTO prompts (name, user_id, content, sharing)
        VALUES ('New Workspace Prompt', (tests.get_supabase_user('test_member')->> 'id')::uuid, 'New workspace prompt content', 'workspace')
        RETURNING id
    )
    INSERT INTO prompt_workspaces (workspace_id, prompt_id, user_id)
    SELECT tests.get_test_workspace_id(), id, ( tests.get_supabase_user ('test_member') ->> 'id' )::uuid FROM new_prompt
    $$, 'Workspace member can insert a new workspace prompt'
    );

-- Test 10: Member can insert a new public prompt
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$
    WITH new_prompt AS (
        INSERT INTO prompts (name, user_id, content, sharing)
        VALUES ('New Public Prompt', (tests.get_supabase_user('test_member')->> 'id')::uuid, 'New public prompt content', 'public')
        RETURNING id
    )
    INSERT INTO prompt_workspaces (workspace_id, prompt_id, user_id)
    SELECT tests.get_test_workspace_id(), id, (tests.get_supabase_user('test_member')->> 'id')::uuid FROM new_prompt
    $$, 'Workspace member can insert a new public prompt'
    );

-- Test 11: Verify the newly inserted public prompt is visible to non-members
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM prompts p WHERE p.sharing = ''public''', ARRAY[2::bigint], 'Non-member can see the newly inserted public prompt'
    );

-- Test 12: Owner can delete their private prompt
SELECT tests.authenticate_as ('test_owner');

SELECT lives_ok (
        $$DELETE FROM prompts WHERE id IN (SELECT prompt_id FROM prompt_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'private'$$, 'Workspace owner can delete their private prompt'
    );

-- Test 13: Member can delete workspace prompt
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$DELETE FROM prompts WHERE id IN (SELECT prompt_id FROM prompt_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace'$$, 'Workspace member can delete workspace prompt'
    );

-- Test 14: Member can delete public prompt in their workspace
SELECT lives_ok (
        $$DELETE FROM prompts WHERE id IN (SELECT prompt_id FROM prompt_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public'$$, 'Workspace member can delete public prompt in their workspace'
    );

-- Test 15: Verify public prompt visibility for non-members
SELECT tests.authenticate_as ('test_non_member');

SELECT isnt_empty (
        'SELECT count(*) FROM prompts p JOIN prompt_workspaces pw ON p.id = pw.prompt_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''public''', 'Non-member can see public prompt'
    );

-- Test 16: Non-member cannot update public prompt
SELECT is_empty (
        $$UPDATE prompts SET name = 'Unauthorized Update' WHERE id IN (SELECT prompt_id FROM prompt_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public' RETURNING name$$, 'Non-member cannot update public prompt'
    );

-- Test 17: Non-member cannot delete public prompt
SELECT is_empty (
        $$DELETE FROM prompts WHERE id IN (SELECT prompt_id FROM prompt_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public' RETURNING name$$, 'Non-member cannot delete public prompt'
    );

-- Test 18: Workspace owner cannot see private prompts of other users
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM prompts p JOIN prompt_workspaces pw ON p.id = pw.prompt_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''private'' AND p.user_id != (tests.get_supabase_user(''test_owner'')->> ''id'')::uuid', ARRAY[0::bigint], 'Workspace owner cannot see private prompts of other users'
    );

-- Test 19: Workspace owner can see and update workspace and public prompts
SELECT results_eq (
        'SELECT count(*) FROM prompts p JOIN prompt_workspaces pw ON p.id = pw.prompt_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing IN (''workspace'', ''public'')', ARRAY[2::bigint], 'Workspace owner can select workspace and public prompts'
    );

-- Test 20: Non-member cannot see or update workspace prompts
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM prompts p JOIN prompt_workspaces pw ON p.id = pw.prompt_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''workspace''', ARRAY[0::bigint], 'Non-member cannot see workspace prompts'
    );

SELECT is_empty (
        $$UPDATE prompts SET name = 'Unauthorized Update' WHERE id IN (SELECT prompt_id FROM prompt_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace' RETURNING name$$, 'Non-member cannot update workspace prompts'
    );

-- Test 21: Workspace member cannot select private prompt they didn't create
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM prompts p JOIN prompt_workspaces pw ON p.id = pw.prompt_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''private'' AND p.user_id != (tests.get_supabase_user(''test_member'')->> ''id'')::uuid', ARRAY[0::bigint], 'Workspace member cannot select private prompt they didn''t create'
    );

-- Finish the tests and clean up
SELECT * FROM finish ();

ROLLBACK;