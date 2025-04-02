-- Fix RLS issues for tables where RLS policies exist but RLS is not enabled
-- or tables in public schema that need RLS enabled

-- Enable RLS on public.prompts_categories (already has policies but RLS might not be enabled)
ALTER TABLE public.prompts_categories ENABLE ROW LEVEL SECURITY;

-- Enable RLS on public.application_models
ALTER TABLE public.application_models ENABLE ROW LEVEL SECURITY;
-- Create policy for public.application_models
CREATE POLICY "Allow select on application_models" ON public.application_models
  FOR SELECT USING (true);
CREATE POLICY "Allow insert/update/delete for application owners" ON public.application_models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_models.application_id
      AND (
        a.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM workspace_users wu
          WHERE wu.workspace_id = a.workspace_id
          AND wu.user_id = auth.uid()
          AND wu.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Enable RLS on public.subdomain_adjectives
ALTER TABLE public.subdomain_adjectives ENABLE ROW LEVEL SECURITY;
-- Create policy for public.subdomain_adjectives (read-only for all authenticated users)
CREATE POLICY "Allow select on subdomain_adjectives" ON public.subdomain_adjectives
  FOR SELECT USING (true);

-- Enable RLS on public.subdomain_nouns
ALTER TABLE public.subdomain_nouns ENABLE ROW LEVEL SECURITY;
-- Create policy for public.subdomain_nouns (read-only for all authenticated users)
CREATE POLICY "Allow select on subdomain_nouns" ON public.subdomain_nouns
  FOR SELECT USING (true);
