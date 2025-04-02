-- Add google_analytics_id and disable_banner columns to workspaces table
ALTER TABLE workspaces ADD COLUMN google_analytics_id TEXT;
ALTER TABLE workspaces ADD COLUMN disable_banner BOOLEAN DEFAULT FALSE; 