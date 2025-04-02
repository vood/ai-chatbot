-- Add new columns to workspaces table
ALTER TABLE workspaces
ADD COLUMN openai_api_key TEXT,
ADD COLUMN openai_organization_id TEXT,
ADD COLUMN anthropic_api_key TEXT,
ADD COLUMN google_gemini_api_key TEXT,
ADD COLUMN mistral_api_key TEXT,
ADD COLUMN groq_api_key TEXT,
ADD COLUMN perplexity_api_key TEXT,
ADD COLUMN azure_openai_api_key TEXT,
ADD COLUMN azure_openai_endpoint TEXT,
ADD COLUMN azure_openai_35_turbo_id TEXT,
ADD COLUMN azure_openai_45_turbo_id TEXT,
ADD COLUMN azure_openai_45_vision_id TEXT,
ADD COLUMN azure_openai_embeddings_id TEXT,
ADD COLUMN openrouter_api_key TEXT,
ADD COLUMN use_azure_openai BOOLEAN DEFAULT false;

-- Move data from profiles to workspaces
UPDATE workspaces
SET
    openai_api_key = profiles.openai_api_key,
    openai_organization_id = profiles.openai_organization_id,
    anthropic_api_key = profiles.anthropic_api_key,
    google_gemini_api_key = profiles.google_gemini_api_key,
    mistral_api_key = profiles.mistral_api_key,
    groq_api_key = profiles.groq_api_key,
    perplexity_api_key = profiles.perplexity_api_key,
    azure_openai_api_key = profiles.azure_openai_api_key,
    azure_openai_endpoint = profiles.azure_openai_endpoint,
    azure_openai_35_turbo_id = profiles.azure_openai_35_turbo_id,
    azure_openai_45_turbo_id = profiles.azure_openai_45_turbo_id,
    azure_openai_45_vision_id = profiles.azure_openai_45_vision_id,
    azure_openai_embeddings_id = profiles.azure_openai_embeddings_id,
    openrouter_api_key = profiles.openrouter_api_key,
    use_azure_openai = profiles.use_azure_openai
FROM profiles
WHERE
    workspaces.user_id = profiles.user_id;