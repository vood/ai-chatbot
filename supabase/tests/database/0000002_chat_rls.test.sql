BEGIN;

SELECT tests.init_users ();

-- Plan the tests
SELECT plan (22);

-- Create a test chat
CREATE OR REPLACE FUNCTION tests.create_test_chat(workspace_id uuid, sharing text) RETURNS uuid AS $$
DECLARE
    chat_id uuid;
BEGIN
    INSERT INTO chats (
        name, user_id, workspace_id, context_length, embeddings_provider,
        include_profile_context, include_workspace_instructions, model,
        prompt, temperature, sharing
    )
    VALUES (
        'Test Chat',
        (SELECT id FROM auth.users WHERE email = 'test_owner@example.com'),
        workspace_id,
        4096,
        'openai',
        true,
        true,
        'gpt-3.5-turbo',
        'Test prompt',
        0.7,
        sharing
    )
    RETURNING id INTO chat_id;
    
    RETURN chat_id;
END;
$$ LANGUAGE plpgsql;

-- Set up test data
DO $$
DECLARE
    private_chat_id uuid;
    workspace_chat_id uuid;
    public_chat_id uuid;
BEGIN
    SELECT tests.create_test_chat(tests.get_test_workspace_id(), 'private') INTO private_chat_id;
    SELECT tests.create_test_chat(tests.get_test_workspace_id(), 'workspace') INTO workspace_chat_id;
    SELECT tests.create_test_chat(tests.get_test_workspace_id(), 'public') INTO public_chat_id;
END $$;

-- Test 1: Owner can select all their chats
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM chats WHERE workspace_id = tests.get_test_workspace_id()', ARRAY[3::bigint], 'Workspace owner can select all their chats'
    );

-- Test 2: Owner can update their private chat
SELECT lives_ok (
        $$UPDATE chats SET name = 'Updated Private Chat' WHERE workspace_id = tests.get_test_workspace_id() AND sharing = 'private'$$, 'Workspace owner can update their private chat'
    );

-- Test 3: Member can select workspace and public chats
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing IN (''workspace'', ''public'')', ARRAY[2::bigint], 'Workspace member can select workspace and public chats'
    );

-- Test 4: Member cannot select private chat
SELECT results_eq (
        'SELECT count(*) FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing = ''private''', ARRAY[0::bigint], 'Workspace member cannot select private chat'
    );

-- Test 5: Member can update workspace chat
SELECT lives_ok (
        $$UPDATE chats SET name = 'Updated Workspace Chat' WHERE workspace_id = tests.get_test_workspace_id() AND sharing = 'workspace'$$, 'Workspace member can update workspace chat'
    );

-- Test 6: Member can update public chat in their workspace
SELECT lives_ok (
        $$UPDATE chats SET name = 'Updated Public Chat' WHERE workspace_id = tests.get_test_workspace_id() AND sharing = 'public'$$, 'Workspace member can update public chat in their workspace'
    );

-- Test 7: Non-member can only select public chat
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing = ''public''', ARRAY[1::bigint], 'Non-member can only select public chat'
    );

-- Test 8: Owner can insert a new private chat
SELECT tests.authenticate_as ('test_owner');

SELECT lives_ok (
        $$
    INSERT INTO chats (name, user_id, workspace_id, context_length, embeddings_provider, include_profile_context, include_workspace_instructions, model, prompt, temperature, sharing)
    VALUES ('New Private Chat', (tests.get_supabase_user('test_owner')->> 'id')::uuid, tests.get_test_workspace_id(), 4096, 'openai', true, true, 'gpt-3.5-turbo', 'New prompt', 0.7, 'private')
    $$, 'Workspace owner can insert a new private chat'
    );

-- Test 9: Member can insert a new workspace chat
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$
    INSERT INTO chats (name, user_id, workspace_id, context_length, embeddings_provider, include_profile_context, include_workspace_instructions, model, prompt, temperature, sharing)
    VALUES ('New Workspace Chat', (tests.get_supabase_user('test_member')->> 'id')::uuid, tests.get_test_workspace_id(), 4096, 'openai', true, true, 'gpt-3.5-turbo', 'New prompt', 0.7, 'workspace')
    $$, 'Workspace member can insert a new workspace chat'
    );

-- Test 10: Member can insert a new public chat
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$
    INSERT INTO chats (name, user_id, workspace_id, context_length, embeddings_provider, include_profile_context, include_workspace_instructions, model, prompt, temperature, sharing)
    VALUES ('New Public Chat', (tests.get_supabase_user('test_member')->> 'id')::uuid, tests.get_test_workspace_id(), 4096, 'openai', true, true, 'gpt-3.5-turbo', 'New public prompt', 0.7, 'public')
    $$, 'Workspace member can insert a new public chat'
    );

-- Test 11: Verify the newly inserted public chat is visible to non-members
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing = ''public''', ARRAY[2::bigint], 'Non-member can see the newly inserted public chat'
    );

-- Test 12: Owner can delete their private chat
SELECT tests.authenticate_as ('test_owner');

SELECT lives_ok (
        $$DELETE FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing = 'private'$$, 'Workspace owner can delete their private chat'
    );

-- Test 13: Member can delete workspace chat
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$DELETE FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing = 'workspace'$$, 'Workspace member can delete workspace chat'
    );

-- Test 14: Member can delete public chat in their workspace
SELECT lives_ok (
        $$DELETE FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing = 'public'$$, 'Workspace member can delete public chat in their workspace'
    );

-- Test 15: Verify public chat visibility for non-members
SELECT tests.authenticate_as ('test_non_member');

SELECT isnt_empty (
        'SELECT count(*) FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing = ''public''', 'Non-member can see public chat'
    );

-- Test 16: Non-member cannot update public chat
SELECT is_empty (
        $$UPDATE chats SET name = 'Unauthorized Update' WHERE workspace_id = tests.get_test_workspace_id() AND sharing = 'public' RETURNING name$$, 'Non-member cannot update public chat'
    );

-- Test 17: Non-member cannot delete public chat
SELECT is_empty (
        $$DELETE FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing = 'public' RETURNING name$$, 'Non-member cannot delete public chat'
    );

-- Test 18: Workspace owner cannot see private chats of other users
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing = ''private'' AND user_id != (tests.get_supabase_user(''test_owner'')->> ''id'')::uuid', ARRAY[0::bigint], 'Workspace owner cannot see private chats of other users'
    );

-- Test 19: Workspace owner can see and update workspace and public chats
SELECT results_eq (
        'SELECT count(*) FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing IN (''workspace'', ''public'')', ARRAY[2::bigint], 'Workspace owner can select workspace and public chats'
    );

-- Test 20: Non-member cannot see or update workspace chats
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing = ''workspace''', ARRAY[0::bigint], 'Non-member cannot see workspace chats'
    );

SELECT is_empty (
        $$UPDATE chats SET name = 'Unauthorized Update' WHERE workspace_id = tests.get_test_workspace_id() AND sharing = 'workspace' RETURNING name$$, 'Non-member cannot update workspace chats'
    );

-- Test 21: Workspace member cannot select private chat they didn't create
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM chats WHERE workspace_id = tests.get_test_workspace_id() AND sharing = ''private'' AND user_id != (tests.get_supabase_user(''test_member'')->> ''id'')::uuid', ARRAY[0::bigint], 'Workspace member cannot select private chat they didn''t create'
    );

-- Finish the tests and clean up
SELECT * FROM finish ();

ROLLBACK;