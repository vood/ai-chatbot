BEGIN;

SELECT tests.init_users ();

-- Plan the tests
SELECT plan (22);

-- Create a test file and associate it with a workspace
CREATE OR REPLACE FUNCTION tests.create_test_file(workspace_id uuid, sharing text) RETURNS uuid AS $$
DECLARE
    file_id uuid;
BEGIN
    INSERT INTO files (
        name, user_id, sharing, description, type, file_path, size, tokens
    )
    VALUES (
        'Test file',
        (SELECT id FROM auth.users WHERE email = 'test_owner@example.com'),
        sharing,
        'Test file description',
        'application/pdf',
        'test_file.pdf',
        100,
        1000
    )
    RETURNING id INTO file_id;

    -- Associate the file with the workspace
    INSERT INTO file_workspaces (workspace_id, file_id, user_id)
    VALUES (workspace_id, file_id, (SELECT id FROM auth.users WHERE email = 'test_owner@example.com'));
    
    RETURN file_id;
END;
$$ LANGUAGE plpgsql;

-- Set up test data
DO $$
DECLARE
    private_file_id uuid;
    workspace_file_id uuid;
    public_file_id uuid;
BEGIN
    SELECT tests.create_test_file(tests.get_test_workspace_id(), 'private') INTO private_file_id;
    SELECT tests.create_test_file(tests.get_test_workspace_id(), 'workspace') INTO workspace_file_id;
    SELECT tests.create_test_file(tests.get_test_workspace_id(), 'public') INTO public_file_id;
END $$;

-- Test 1: Owner can select all their files
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM files p JOIN file_workspaces pw ON p.id = pw.file_id WHERE pw.workspace_id = tests.get_test_workspace_id()', ARRAY[3::bigint], 'Workspace owner can select all their files'
    );

-- Test 2: Owner can update their private file
SELECT lives_ok (
        $$UPDATE files SET name = 'Updated Private file' WHERE id IN (SELECT file_id FROM file_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'private'$$, 'Workspace owner can update their private file'
    );

-- Test 3: Member can select workspace and public files
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM files p WHERE p.sharing IN (''workspace'', ''public'')', ARRAY[2::bigint], 'Workspace member can select workspace and public files'
    );

-- Test 4: Member cannot select private file
SELECT results_eq (
        'SELECT count(*) FROM files p JOIN file_workspaces pw ON p.id = pw.file_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''private''', ARRAY[0::bigint], 'Workspace member cannot select private file'
    );

-- Test 5: Member can update workspace file
SELECT lives_ok (
        $$UPDATE files SET name = 'Updated Workspace file' WHERE id IN (SELECT file_id FROM file_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace'$$, 'Workspace member can update workspace file'
    );

-- Test 6: Member can update public file in their workspace
SELECT lives_ok (
        $$UPDATE files SET name = 'Updated Public file' WHERE id IN (SELECT file_id FROM file_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public'$$, 'Workspace member can update public file in their workspace'
    );

-- Test 7: Non-member can only select public file
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM files p WHERE p.sharing = ''public''', ARRAY[1::bigint], 'Non-member can only select public file'
    );

-- Test 8: Owner can insert a new private file
SELECT tests.authenticate_as ('test_owner');

SELECT lives_ok (
        $$
    WITH new_file AS (
        INSERT INTO files (name, user_id, sharing, description, type, file_path, size, tokens)
        VALUES ('New Private file', (tests.get_supabase_user('test_owner')->> 'id')::uuid, 'private', 'Test file description', 'application/pdf', 'test_file.pdf', 100, 1000)
        RETURNING id
    )
    INSERT INTO file_workspaces (workspace_id, file_id, user_id)
    SELECT tests.get_test_workspace_id(), id, ( tests.get_supabase_user ('test_owner') ->> 'id' )::uuid FROM new_file
    $$, 'Workspace owner can insert a new private file'
    );

-- Test 9: Member can insert a new workspace file
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$
    WITH new_file AS (
        INSERT INTO files (name, user_id, sharing, description, type, file_path, size, tokens)
        VALUES ('New Workspace file', (tests.get_supabase_user('test_member')->> 'id')::uuid, 'workspace', 'Test file description', 'application/pdf', 'test_file.pdf', 100, 1000)
        RETURNING id
    )
    INSERT INTO file_workspaces (workspace_id, file_id, user_id)
    SELECT tests.get_test_workspace_id(), id, ( tests.get_supabase_user ('test_member') ->> 'id' )::uuid FROM new_file
    $$, 'Workspace member can insert a new workspace file'
    );

-- Test 10: Member can insert a new public file
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$
    WITH new_file AS (
        INSERT INTO files (name, user_id, sharing, description, type, file_path, size, tokens)
        VALUES ('New Public file', (tests.get_supabase_user('test_member')->> 'id')::uuid, 'public', 'Test file description', 'application/pdf', 'test_file.pdf', 100, 1000)
        RETURNING id
    )
    INSERT INTO file_workspaces (workspace_id, file_id, user_id)
    SELECT tests.get_test_workspace_id(), id, (tests.get_supabase_user('test_member')->> 'id')::uuid FROM new_file
    $$, 'Workspace member can insert a new public file'
    );

-- Test 11: Verify the newly inserted public file is visible to non-members
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM files p WHERE p.sharing = ''public''', ARRAY[2::bigint], 'Non-member can see the newly inserted public file'
    );

-- Test 12: Owner can delete their private file
SELECT tests.authenticate_as ('test_owner');

SELECT lives_ok (
        $$DELETE FROM files WHERE id IN (SELECT file_id FROM file_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'private'$$, 'Workspace owner can delete their private file'
    );

-- Test 13: Member can delete workspace file
SELECT tests.authenticate_as ('test_member');

SELECT lives_ok (
        $$DELETE FROM files WHERE id IN (SELECT file_id FROM file_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace'$$, 'Workspace member can delete workspace file'
    );

-- Test 14: Member can delete public file in their workspace
SELECT lives_ok (
        $$DELETE FROM files WHERE id IN (SELECT file_id FROM file_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public'$$, 'Workspace member can delete public file in their workspace'
    );

-- Test 15: Verify public file visibility for non-members
SELECT tests.authenticate_as ('test_non_member');

SELECT isnt_empty (
        'SELECT count(*) FROM files p JOIN file_workspaces pw ON p.id = pw.file_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''public''', 'Non-member can see public file'
    );

-- Test 16: Non-member cannot update public file
SELECT is_empty (
        $$UPDATE files SET name = 'Unauthorized Update' WHERE id IN (SELECT file_id FROM file_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public' RETURNING name$$, 'Non-member cannot update public file'
    );

-- Test 17: Non-member cannot delete public file
SELECT is_empty (
        $$DELETE FROM files WHERE id IN (SELECT file_id FROM file_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'public' RETURNING name$$, 'Non-member cannot delete public file'
    );

-- Test 18: Workspace owner cannot see private files of other users
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM files p JOIN file_workspaces pw ON p.id = pw.file_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''private'' AND p.user_id != (tests.get_supabase_user(''test_owner'')->> ''id'')::uuid', ARRAY[0::bigint], 'Workspace owner cannot see private files of other users'
    );

-- Test 19: Workspace owner can see and update workspace and public files
SELECT results_eq (
        'SELECT count(*) FROM files p JOIN file_workspaces pw ON p.id = pw.file_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing IN (''workspace'', ''public'')', ARRAY[2::bigint], 'Workspace owner can select workspace and public files'
    );

-- Test 20: Non-member cannot see or update workspace files
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM files p JOIN file_workspaces pw ON p.id = pw.file_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''workspace''', ARRAY[0::bigint], 'Non-member cannot see workspace files'
    );

SELECT is_empty (
        $$UPDATE files SET name = 'Unauthorized Update' WHERE id IN (SELECT file_id FROM file_workspaces WHERE workspace_id = tests.get_test_workspace_id()) AND sharing = 'workspace' RETURNING name$$, 'Non-member cannot update workspace files'
    );

-- Test 21: Workspace member cannot select private file they didn't create
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM files p JOIN file_workspaces pw ON p.id = pw.file_id WHERE pw.workspace_id = tests.get_test_workspace_id() AND p.sharing = ''private'' AND p.user_id != (tests.get_supabase_user(''test_member'')->> ''id'')::uuid', ARRAY[0::bigint], 'Workspace member cannot select private file they didn''t create'
    );

-- Finish the tests and clean up
SELECT * FROM finish ();

ROLLBACK;