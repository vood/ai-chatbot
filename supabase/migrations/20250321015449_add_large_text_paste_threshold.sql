-- Add large_text_paste_threshold column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN large_text_paste_threshold integer DEFAULT 1000;
