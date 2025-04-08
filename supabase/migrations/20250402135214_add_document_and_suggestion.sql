CREATE TABLE IF NOT EXISTS "document" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" TIMESTAMPTZ,
	"title" text NOT NULL,
	"content" text,
	"metadata" jsonb,
	"user_id" uuid NOT NULL,
	CONSTRAINT "document_id_created_at_pk" PRIMARY KEY("id","created_at")
);

CREATE TABLE IF NOT EXISTS "suggestion" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"document_created_at" TIMESTAMPTZ NOT NULL,
	"original_text" text NOT NULL,
	"suggested_text" text NOT NULL,
	"description" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" TIMESTAMPTZ,
	CONSTRAINT "suggestion_id_pk" PRIMARY KEY("id")
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_document_updated_at BEFORE UPDATE
ON document FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_suggestion_updated_at BEFORE UPDATE
ON suggestion FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS
ALTER TABLE document ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow users to read their own documents" 
ON document FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own documents" 
ON document FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own documents" 
ON document FOR UPDATE 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own documents" 
ON document FOR DELETE 
USING (user_id = auth.uid());

CREATE POLICY "Allow users to read their own suggestions" 
ON suggestion FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own suggestions" 
ON suggestion FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own suggestions" 
ON suggestion FOR UPDATE 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own suggestions" 
ON suggestion FOR DELETE 
USING (user_id = auth.uid());

DO $$ BEGIN
 ALTER TABLE "document" ADD CONSTRAINT "document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_document_id_document_created_at_fk" FOREIGN KEY ("document_id","document_created_at") REFERENCES "public"."document"("id","created_at") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$; 