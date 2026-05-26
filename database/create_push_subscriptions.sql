-- ============================================================
-- PUSH SUBSCRIPTIONS DATABASE SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gm_push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_account_id UUID NOT NULL REFERENCES public.gm_student_accounts(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(student_account_id)
);

-- Enable RLS
ALTER TABLE public.gm_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: Allow SELECT only for authenticated users (the student themselves)
DROP POLICY IF EXISTS "gm_push_subscriptions_select_auth" ON public.gm_push_subscriptions;
CREATE POLICY "gm_push_subscriptions_select_auth" ON public.gm_push_subscriptions
    FOR SELECT TO authenticated
    USING (
        student_account_id IN (
            SELECT id FROM public.gm_student_accounts 
            WHERE username = auth.jwt() ->> 'email' OR google_email = auth.jwt() ->> 'email'
        )
    );

-- 2. Insert/Update Policy: Allow insert/update for authenticated users
DROP POLICY IF EXISTS "gm_push_subscriptions_all_auth" ON public.gm_push_subscriptions;
CREATE POLICY "gm_push_subscriptions_all_auth" ON public.gm_push_subscriptions
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Read Policy: Allow admin read-only access for reminders (anon is also used in backend-admin context without auth.uid)
DROP POLICY IF EXISTS "gm_push_subscriptions_read_anon" ON public.gm_push_subscriptions;
CREATE POLICY "gm_push_subscriptions_read_anon" ON public.gm_push_subscriptions
    FOR SELECT TO anon
    USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gm_push_subscriptions_student ON public.gm_push_subscriptions(student_account_id);
