-- Drop the trigger first
DROP TRIGGER IF EXISTS delete_old_file ON files;

-- Then drop the function
-- DROP FUNCTION IF EXISTS delete_old_file();