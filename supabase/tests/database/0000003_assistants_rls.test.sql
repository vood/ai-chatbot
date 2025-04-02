BEGIN;

SELECT tests.init_users ();

-- Plan the tests
SELECT plan (22);

-- Create a test assistant and associate it with a workspace
CREATE OR REPLACE FUNCTION tests.create_test_assistant(workspace_id uuid, sharing text) RETURNS uuid AS $$
DECLARE
    assistant_id uuid;
BEGIN
    INSERT INTO assistants (
        name, user_id, context_length, embeddings_provider,
        include_profile_context, include_workspace_instructions, model,
        prompt, temperature, sharing, description, image_path
    )
    VALUES (
        'Test Assistant',
        (SELECT id FROM auth.users WHERE email = 'test_owner@example.com'),
        4096,
        'openai',
        true,
        true,
        'gpt-3.5-turbo',
        'Test prompt',
        0.7,
        sharing,
        'Test description',
        'test_image_path'
    )
    RETURNING id INTO assistant_id;

    -- Associate the assistant with the workspace
    INSERT INTO assistant_workspaces (workspace_id, assistant_id, user_id)
    VALUES (workspace_id, assistant_id, (SELECT id FROM auth.users WHERE email = 'test_owner@example.com'));
    
    RETURN assistant_id;
END;
$$ LANGUAGE plpgsql;

-- Set up test data
DO $$
DECLARE
    private_assistant_id uuid;
    workspace_assistant_id uuid;
    public_assistant_id uuid;
BEGIN
    SELECT tests.create_test_assistant(tests.get_test_workspace_id(), 'private') INTO private_assistant_id;
    SELECT tests.create_test_assistant(tests.get_test_workspace_id(), 'workspace') INTO workspace_assistant_id;
    SELECT tests.create_test_assistant(tests.get_test_workspace_id(), 'public') INTO public_assistant_id;
END $$;

-- Test 1: Owner can select all their assistants
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM assistants a JOIN assistant_workspaces wa ON a.id = wa.assistant_id WHERE wa.workspace_id = tests.get_test_workspace_id()', ARRAY[3::bigint], 'Workspace owner can select all their assistants'
    );

-- Test 2: Owner can update their private assistant
SELECT lives_ok (
        $$UPDATE assistants SET name = 'Updated Private Assistant' WHERE id IN (SELECT assistant_id FROM assistant_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'private'$$, 'Workspace owner can update their private assistant'
    );

-- Test 3: Member can select workspace and public assistants
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM assistants a JOIN assistant_workspaces wa ON a.id = wa.assistant_id WHERE wa.workspace_id = tests.get_test_workspace_id() AND a.sharing IN (''workspace'', ''public'')', ARRAY[2::bigint], 'Workspace member can select workspace and public assistants'
    );

-- Test 4: Member cannot select private assistant
SELECT results_eq (
        'SELECT count(*) FROM assistants a JOIN assistant_workspaces wa ON a.id = wa.assistant_id WHERE wa.workspace_id = tests.get_test_workspace_id() AND a.sharing = ''private''', ARRAY[0::bigint], 'Workspace member cannot select private assistant'
    );

-- Test 5: Member can update workspace assistant
SELECT lives_ok (
        $$UPDATE assistants SET name = 'Updated Workspace Assistant' WHERE id IN (SELECT assistant_id FROM assistant_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace'$$, 'Workspace member can update workspace assistant'
    );

-- Test 6: Member can update public assistant in their workspace
SELECT lives_ok (
        $$UPDATE assistants SET name = 'Updated Public Assistant' WHERE id IN (SELECT assistant_id FROM assistant_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public'$$, 'Workspace member can update public assistant in their workspace'
    );

-- Test 7: Non-member can only select public assistant
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM assistants a WHERE a.user_id <> (tests.get_supabase_user(''test_non_member'')->> ''id'')::uuid AND a.sharing = ''public''', ARRAY[1::bigint], 'Non-member can only select public assistant'
    );

-- Test 8: Owner can insert a new private assistant
SELECT tests.authenticate_as ('test_owner');

SELECT lives_ok (
        $$
    WITH new_assistant AS (
        INSERT INTO assistants (name, user_id, context_length, embeddings_provider, include_profile_context, include_workspace_instructions, model, prompt, temperature, sharing, image_path, description)
        VALUES ('New Private Assistant', (tests.get_supabase_user('test_owner')->> 'id')::uuid, 4096, 'openai', true, true, 'gpt-3.5-turbo', 'New prompt', 0.7, 'private', 'test_image_path', 'Test description')
        RETURNING id
    )
    INSERT INTO assistant_workspaces (workspace_id, assistant_id, user_id)
    SELECT tests.get_test_workspace_id(), id, (tests.get_supabase_user('test_owner')->> 'id')::uuid FROM new_assistant
    $$, 'Workspace owner can insert a new private assistant'
    );

-- Test 9: Member can insert a new workspace assistant
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$
    WITH new_assistant AS (
        INSERT INTO assistants (name, user_id, context_length, embeddings_provider, include_profile_context, include_workspace_instructions, model, prompt, temperature, sharing, image_path, description)
        VALUES ('New Workspace Assistant', (tests.get_supabase_user('test_member')->> 'id')::uuid, 4096, 'openai', true, true, 'gpt-3.5-turbo', 'New prompt', 0.7, 'workspace', 'test_image_path', 'Test description')
        RETURNING id
    )
    INSERT INTO assistant_workspaces (workspace_id, assistant_id, user_id)
    SELECT tests.get_test_workspace_id(), id, (tests.get_supabase_user('test_member')->> 'id')::uuid FROM new_assistant
    $$, 'Workspace member can insert a new workspace assistant'
    );

-- Test 10: Member can insert a new public assistant
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$
    WITH new_assistant AS (
        INSERT INTO assistants (name, user_id, context_length, embeddings_provider, include_profile_context, include_workspace_instructions, model, prompt, temperature, sharing, image_path, description)
        VALUES ('New Public Assistant', (tests.get_supabase_user('test_member')->> 'id')::uuid, 4096, 'openai', true, true, 'gpt-3.5-turbo', 'New public prompt', 0.7, 'public', 'test_image_path', 'Test description')
        RETURNING id
    )
    INSERT INTO assistant_workspaces (workspace_id, assistant_id, user_id)
    SELECT tests.get_test_workspace_id(), id, (tests.get_supabase_user('test_member')->> 'id')::uuid FROM new_assistant
    $$, 'Workspace member can insert a new public assistant'
    );

-- Test 11: Verify the newly inserted public assistant is visible to non-members
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM assistants a WHERE a.sharing = ''public''', ARRAY[2::bigint], 'Non-member can see the newly inserted public assistant'
    );

-- Test 12: Owner can delete their private assistant
SELECT tests.authenticate_as ('test_owner');

SELECT lives_ok (
        $$DELETE FROM assistants WHERE id IN (SELECT assistant_id FROM assistant_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'private'$$, 'Workspace owner can delete their private assistant'
    );

-- Test 13: Member can delete workspace assistant
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$DELETE FROM assistants WHERE id IN (SELECT assistant_id FROM assistant_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace'$$, 'Workspace member can delete workspace assistant'
    );

-- Test 14: Member can delete public assistant in their workspace
SELECT lives_ok (
        $$DELETE FROM assistants WHERE id IN (SELECT assistant_id FROM assistant_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public'$$, 'Workspace member can delete public assistant in their workspace'
    );

-- Test 15: Verify public assistant visibility for non-members
SELECT tests.authenticate_as ('test_non_member');

SELECT isnt_empty (
        'SELECT count(*) FROM assistants a JOIN assistant_workspaces wa ON a.id = wa.assistant_id WHERE wa.workspace_id = tests.get_test_workspace_id() AND a.sharing = ''public''', 'Non-member can see public assistant'
    );

-- Test 16: Non-member cannot update public assistant
SELECT is_empty (
        $$UPDATE assistants SET name = 'Unauthorized Update' WHERE id IN (SELECT assistant_id FROM assistant_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public' RETURNING name$$, 'Non-member cannot update public assistant'
    );

-- Test 17: Non-member cannot delete public assistant
SELECT is_empty (
        $$DELETE FROM assistants WHERE id IN (SELECT assistant_id FROM assistant_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public' RETURNING name$$, 'Non-member cannot delete public assistant'
    );

-- Test 18: Workspace owner cannot see private assistants of other users
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM assistants a JOIN assistant_workspaces wa ON a.id = wa.assistant_id WHERE wa.workspace_id = tests.get_test_workspace_id() AND a.sharing = ''private'' AND a.user_id != (tests.get_supabase_user(''test_owner'')->> ''id'')::uuid', ARRAY[0::bigint], 'Workspace owner cannot see private assistants of other users'
    );

-- Test 19: Workspace owner can see and update workspace and public assistants
SELECT results_eq (
        'SELECT count(*) FROM assistants a JOIN assistant_workspaces wa ON a.id = wa.assistant_id WHERE wa.workspace_id = tests.get_test_workspace_id() AND a.sharing IN (''workspace'', ''public'')', ARRAY[2::bigint], 'Workspace owner can select workspace and public assistants'
    );

-- Test 20: Non-member cannot see or update workspace assistants
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM assistants a JOIN assistant_workspaces wa ON a.id = wa.assistant_id WHERE wa.workspace_id = tests.get_test_workspace_id() AND a.sharing = ''workspace''', ARRAY[0::bigint], 'Non-member cannot see workspace assistants'
    );

SELECT is_empty (
        $$UPDATE assistants SET name = 'Unauthorized Update' WHERE id IN (SELECT assistant_id FROM assistant_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace' RETURNING name$$, 'Non-member cannot update workspace assistants'
    );

-- Test 21: Workspace member cannot select private assistant they didn't create
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM assistants a WHERE a.sharing = ''private'' AND a.user_id != (tests.get_supabase_user(''test_member'')->> ''id'')::uuid', ARRAY[0::bigint], 'Workspace member cannot select private assistant they didn''t create'
    );

-- Finish the tests and clean up
SELECT * FROM finish ();

ROLLBACK;