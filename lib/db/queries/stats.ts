import { createClient } from '@/lib/supabase/server';

/**
 * Increment the daily message count for a user
 */
export async function incrementDailyMessageCount({
  userId,
  model,
  workspaceId,
  inputTokenCount,
  outputTokenCount,
}: {
  userId: string;
  model: string;
  workspaceId: string;
  inputTokenCount: number;
  outputTokenCount: number;
}) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc(
      'increment_daily_message_count_tokens',
      {
        p_user_id: userId,
        p_model: model,
        p_workspace_id: workspaceId,
        p_input_token_count: inputTokenCount,
        p_output_token_count: outputTokenCount,
      },
    );

    if (error) {
      console.error('Error incrementing daily message count:', error);
    }
  } catch (error) {
    console.error('Failed to increment daily message count:', error);
  }
}
