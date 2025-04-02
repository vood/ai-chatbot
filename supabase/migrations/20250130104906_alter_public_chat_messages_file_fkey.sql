-- First drop existing foreign key
ALTER TABLE public_chat_messages 
DROP CONSTRAINT IF EXISTS public_chat_messages_file_id_fkey;

-- Re-create with SET NULL
ALTER TABLE public_chat_messages
ADD CONSTRAINT public_chat_messages_file_id_fkey 
FOREIGN KEY (file_id) 
REFERENCES files(id) 
ON DELETE SET NULL;