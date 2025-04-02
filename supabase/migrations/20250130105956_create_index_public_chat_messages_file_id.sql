-- Add index to improve foreign key lookup performance
CREATE INDEX IF NOT EXISTS idx_public_chat_messages_file_id 
ON public_chat_messages(file_id);