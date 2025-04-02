-- Add a foreign key constraint to link workspaces to profiles via user_id
ALTER TABLE workspaces
ADD CONSTRAINT workspaces_owner_profile_fkey FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE;