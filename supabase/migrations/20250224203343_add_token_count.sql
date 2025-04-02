
-- Add token count columns to daily_message_count
ALTER TABLE daily_message_count
ADD COLUMN input_token_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN output_token_count INTEGER NOT NULL DEFAULT 0;

-- Drop the existing functions
DROP FUNCTION IF EXISTS increment_daily_message_count(UUID, TEXT, UUID);
-- Create new increment function for both input and output tokens
CREATE OR REPLACE FUNCTION increment_daily_message_count_tokens(
  p_user_id UUID,
  p_model TEXT,
  p_workspace_id UUID,
  p_input_token_count INTEGER,
  p_output_token_count INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_message_count (
    day,
    user_id,
    model_id,
    workspace_id,
    count,
    input_token_count,
    output_token_count
  )
  VALUES (
    CURRENT_DATE,
    p_user_id,
    p_model,
    p_workspace_id,
    1,
    p_input_token_count,
    p_output_token_count
  )
  ON CONFLICT (day, user_id, model_id, workspace_id)
  DO UPDATE SET
    count = daily_message_count.count + 1,
    input_token_count = daily_message_count.input_token_count + EXCLUDED.input_token_count,
    output_token_count = daily_message_count.output_token_count + EXCLUDED.output_token_count,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;
