alter table daily_message_count add column workspace_id uuid;

alter table daily_message_count
drop constraint daily_message_count_unique;

update daily_message_count
set
    workspace_id = workspaces.id
from workspaces
where
    workspaces.user_id = daily_message_count.user_id;

alter table daily_message_count
alter column workspace_id
set not null;

-- unique not null constraint on workspace_id, user_id
alter table daily_message_count
add constraint daily_message_count_workspace_id_user_id_model_id_key unique (
    day,
    workspace_id,
    user_id,
    model_id
);

drop index daily_message_count_user_id_idx;

create index daily_message_count_workspace_id_user_id_idx on daily_message_count (workspace_id, user_id);

CREATE OR REPLACE FUNCTION update_daily_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' THEN
    INSERT INTO daily_message_count (day, user_id, model_id, workspace_id, count)
    SELECT 
      CURRENT_DATE, 
      NEW.user_id, 
      NEW.model, 
      c.workspace_id, 
      1 
    FROM chats c
    WHERE c.id = NEW.chat_id
    ON CONFLICT (day, user_id, model_id, workspace_id)
    DO UPDATE SET 
      count = daily_message_count.count + 1, 
      updated_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql

SECURITY DEFINER;

-- Create a trigger to update the daily message count
CREATE
OR REPLACE TRIGGER update_daily_message_count_trigger
AFTER INSERT ON messages FOR EACH ROW
EXECUTE FUNCTION update_daily_message_count ();

-- Create a policy to restrict visibility to the user and workspace members
DROP POLICY "Daily message count visibility" ON daily_message_count;

CREATE POLICY "Daily message count visibility" ON daily_message_count FOR ALL USING (
    auth.uid () = user_id
    and is_workspace_member (workspace_id, auth.uid ())
);

-- Enable RLS on the daily_message_count table
ALTER TABLE daily_message_count ENABLE ROW LEVEL SECURITY;