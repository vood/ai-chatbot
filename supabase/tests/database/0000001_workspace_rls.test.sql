BEGIN;

-- Plan the tests
SELECT plan (11);

SELECT tests.init_users ();

-- Test 1: Owner can select their workspace
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM workspaces WHERE id = tests.get_test_workspace_id()', ARRAY[1::bigint], 'Workspace owner can select their workspace'
    );

-- Test 2: Owner can update their workspace
SELECT lives_ok (
        $$UPDATE workspaces SET name = 'Updated Test Workspace' WHERE id = tests.get_test_workspace_id()$$, 'Workspace owner can update their workspace'
    );

-- Test 3: Member can select the workspace
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM workspaces WHERE id = tests.get_test_workspace_id()', ARRAY[1::bigint], 'Workspace member can select the workspace'
    );

-- Test 4: Member cannot update the workspace
SELECT is_empty (
        $$UPDATE workspaces SET name = 'Unauthorized Update' WHERE id = tests.get_test_workspace_id() RETURNING name$$, 'Workspace member cannot update the workspace'
    );

-- Test 5: Non-member cannot select the workspace
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM workspaces WHERE id = tests.get_test_workspace_id()', ARRAY[0::bigint], 'Non-member cannot select the workspace'
    );

-- Test 6: Owner can select workspace_users for their workspace
SELECT tests.authenticate_as ('test_owner');

SELECT results_eq (
        'SELECT count(*) FROM workspace_users WHERE workspace_id = tests.get_test_workspace_id()', ARRAY[2::bigint], 'Workspace owner can select workspace_users for their workspace'
    );

-- Test 7: Owner can insert into workspace_users for their workspace
SELECT lives_ok (
        $$INSERT INTO workspace_users (user_id, workspace_id, role, email, status)
    VALUES ((tests.get_supabase_user('test_non_member')->> 'id')::uuid,
            tests.get_test_workspace_id(), 'MEMBER', 'test_non_member@example.com', 'ACTIVE') $$, 'Workspace owner can insert into workspace_users for their workspace'
    );

SELECT lives_ok (
        $$DELETE FROM workspace_users
    WHERE
        user_id = (
            tests.get_supabase_user ('test_non_member') ->> 'id'
        )::uuid;

$$
    , 'Workspace owner can delete from workspace_users for their workspace'
    );

-- Test 8: Member can select workspace_users for their workspace
SELECT tests.authenticate_as ('test_member');

SELECT results_eq (
        'SELECT count(*) FROM workspace_users WHERE workspace_id = tests.get_test_workspace_id()', ARRAY[2::bigint], 'Workspace member can select workspace_users for their workspace'
    );

-- Test 9: Member cannot insert into workspace_users
SELECT throws_ok (
        $$INSERT INTO workspace_users (user_id, workspace_id, role)
    VALUES ((tests.get_supabase_user('test_non_member')->> 'id')::uuid,
            tests.get_test_workspace_id(), 'member')$$, 'new row violates row-level security policy for table "workspace_users"', 'Workspace member cannot insert into workspace_users'
    );

-- Test 10: Non-member cannot select workspace_users for the workspace
SELECT tests.authenticate_as ('test_non_member');

SELECT results_eq (
        'SELECT count(*) FROM workspace_users WHERE workspace_id = tests.get_test_workspace_id()', ARRAY[0::bigint], 'Non-member cannot select workspace_users for the workspace'
    );

-- Finish the tests and clean up
SELECT * FROM finish ();

ROLLBACK;