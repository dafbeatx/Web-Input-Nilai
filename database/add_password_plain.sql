-- Alter gm_student_accounts to support temporary password plain text storage
ALTER TABLE public.gm_student_accounts 
ADD COLUMN IF NOT EXISTS password_plain TEXT DEFAULT NULL;
