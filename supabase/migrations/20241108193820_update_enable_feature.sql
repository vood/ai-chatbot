create or replace function enable_workspace_feature(target_user_id uuid) returns void
    security definer
    language plpgsql
as
$$
BEGIN

    UPDATE profiles
    SET workspace_migration_enabled = true
    WHERE user_id = target_user_id;
    WITH distinct_users AS (
        SELECT DISTINCT w.id AS workspace_id,
                        w.user_id,
                        u.email
        FROM workspaces w
        JOIN auth.users u ON w.user_id = u.id
        JOIN workspace_users wu ON w.id = wu.workspace_id
        WHERE wu.user_id = target_user_id AND wu.is_current is null
    )
    INSERT INTO workspace_users (workspace_id,
                                 user_id,
                                 email,
                                 role,
                                 status,
                                 is_current)
    SELECT workspace_id,
           user_id,
           email,
           'OWNER',
           'ACTIVE',
           true
    FROM distinct_users
    ON CONFLICT (user_id, is_current)
    WHERE is_current = true DO UPDATE
    SET is_current = EXCLUDED.is_current;

    UPDATE workspaces
    SET name                       = COALESCE(NULLIF(profiles.display_name, ''), SPLIT_PART(u.email, '@', 1)) ||
                                     '''s workspace',
        plan                       = profiles.plan,
        openai_api_key             = profiles.openai_api_key,
        openai_organization_id     = profiles.openai_organization_id,
        anthropic_api_key          = profiles.anthropic_api_key,
        google_gemini_api_key      = profiles.google_gemini_api_key,
        mistral_api_key            = profiles.mistral_api_key,
        groq_api_key               = profiles.groq_api_key,
        perplexity_api_key         = profiles.perplexity_api_key,
        azure_openai_api_key       = profiles.azure_openai_api_key,
        azure_openai_endpoint      = profiles.azure_openai_endpoint,
        azure_openai_35_turbo_id   = profiles.azure_openai_35_turbo_id,
        azure_openai_45_turbo_id   = profiles.azure_openai_45_turbo_id,
        azure_openai_45_vision_id  = profiles.azure_openai_45_vision_id,
        azure_openai_embeddings_id = profiles.azure_openai_embeddings_id,
        openrouter_api_key         = profiles.openrouter_api_key,
        use_azure_openai           = profiles.use_azure_openai
    FROM profiles
             JOIN auth.users u ON profiles.user_id = u.id
    WHERE profiles.user_id = target_user_id
      AND workspaces.user_id = target_user_id;
END;
$$;
