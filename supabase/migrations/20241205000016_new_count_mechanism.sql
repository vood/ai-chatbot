-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_daily_message_count_trigger ON messages;
DROP FUNCTION IF EXISTS update_daily_message_count();

-- Create new increment function
CREATE OR REPLACE FUNCTION increment_daily_message_count(
  p_user_id UUID,
  p_model TEXT,
  p_workspace_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_message_count (
    day,
    user_id,
    model_id,
    workspace_id,
    count
  )
  VALUES (
    CURRENT_DATE,
    p_user_id,
    p_model,
    p_workspace_id,
    1
  )
  ON CONFLICT (day, user_id, model_id, workspace_id)
  DO UPDATE SET
    count = daily_message_count.count + 1,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER; 