-- Modify the existing foreign key constraint to add CASCADE DELETE
alter table daily_message_count
drop constraint daily_message_count_user_id_fkey,
add constraint daily_message_count_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;

alter table prompts_categories
drop constraint prompts_categories_prompt_id_fkey,
add constraint prompts_categories_prompt_id_fkey foreign key (prompt_id) references prompts (id) on delete cascade;