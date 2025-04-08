-- Create a new table for workspace invitations
CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'MEMBER')),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'INVITED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (workspace_id, email)
);

-- Add RLS policies
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can manage invitations"
ON workspace_invitations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM workspace_users
        WHERE workspace_users.workspace_id = workspace_invitations.workspace_id
        AND workspace_users.user_id = auth.uid()
        AND workspace_users.role = 'OWNER'
    )
);

-- Create an index for faster lookups
CREATE INDEX workspace_invitations_workspace_id_idx ON workspace_invitations(workspace_id);
CREATE INDEX workspace_invitations_email_idx ON workspace_invitations(email);

-- Add a trigger to update the updated_at column
CREATE TRIGGER update_workspace_invitations_updated_at
BEFORE UPDATE ON workspace_invitations
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column(); 