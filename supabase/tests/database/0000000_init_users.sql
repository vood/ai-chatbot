-- Plan for 0 tests as this is a setup file
SELECT plan (0);

-- Function to initialize test users and workspaces
CREATE OR REPLACE FUNCTION tests.init_users() RETURNS void AS $$
DECLARE
    test_owner_id uuid;
    test_member_id uuid;
    test_non_member_id uuid;
    test_workspace_id uuid;
BEGIN
    -- Clean up existing data
    DELETE FROM auth.users;
    DELETE FROM workspaces;
    DELETE FROM workspace_users;

    -- Create test users
    test_owner_id := tests.create_supabase_user('test_owner', 'test_owner@example.com');
    test_member_id := tests.create_supabase_user('test_member', 'test_member@example.com');
    test_non_member_id := tests.create_supabase_user('test_non_member', 'test_non_member@example.com');

    SELECT id INTO test_workspace_id FROM workspaces WHERE user_id = test_owner_id LIMIT 1;

    -- Add test_member to the workspace
    INSERT INTO workspace_users (user_id, workspace_id, role, email, status)
    VALUES (test_member_id, test_workspace_id, 'MEMBER', 'test_member@example.com', 'ACTIVE');

    -- Enable workspace feature for all test users
    PERFORM enable_workspace_feature(test_owner_id);
    PERFORM enable_workspace_feature(test_member_id);
    PERFORM enable_workspace_feature(test_non_member_id);
END;
$$ LANGUAGE plpgsql;

-- Function to get the test workspace ID
CREATE OR REPLACE FUNCTION tests.get_test_workspace_id() RETURNS uuid AS $$
    SELECT id
    FROM workspaces
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test_owner@example.com')
    LIMIT 1;
$$ LANGUAGE sql

SECURITY DEFINER;