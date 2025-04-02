-- Create the votes table with underscore naming convention
CREATE TABLE IF NOT EXISTS "public"."votes" (
  "chat_id" uuid NOT NULL,
  "message_id" uuid NOT NULL,
  "is_upvoted" boolean NOT NULL,
  CONSTRAINT "votes_pkey" PRIMARY KEY ("chat_id", "message_id")
);

-- Add foreign key constraints
ALTER TABLE "public"."votes"
  ADD CONSTRAINT "votes_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;

ALTER TABLE "public"."votes"
  ADD CONSTRAINT "votes_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;

-- Add RLS policy for votes
ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for users based on chat_id" ON "public"."votes"
  USING (EXISTS (SELECT 1 FROM chats WHERE id = chat_id AND (user_id = auth.uid() OR sharing = 'public')))
  WITH CHECK (EXISTS (SELECT 1 FROM chats WHERE id = chat_id AND user_id = auth.uid())); 