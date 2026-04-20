-- Run this in Supabase SQL Editor to add target_days column
ALTER TABLE public.moneyboxes ADD COLUMN IF NOT EXISTS target_days int;
