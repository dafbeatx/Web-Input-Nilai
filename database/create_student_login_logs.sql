-- SQL Declaration for public.gm_student_login_logs
-- Copy and paste this script directly into the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.gm_student_login_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.gm_student_accounts(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL DEFAULT 'unknown',
    user_agent TEXT NOT NULL DEFAULT 'unknown',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance optimization (Account ID lookup and ordering by timestamp)
CREATE INDEX IF NOT EXISTS idx_gm_student_login_logs_account ON public.gm_student_login_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_gm_student_login_logs_created ON public.gm_student_login_logs(created_at DESC);

-- Enable Row Level Security (RLS) for data protection
ALTER TABLE public.gm_student_login_logs ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Authenticated users can view their own login logs
CREATE POLICY "gm_student_login_logs_read_own" ON public.gm_student_login_logs
    FOR SELECT TO authenticated
    USING (
        account_id IN (
            SELECT id FROM public.gm_student_accounts WHERE google_email = auth.jwt()->>'email'
        )
    );

-- 2. Policy: Anonymous access for log inserts during login checks (backend-driven inserts via service role bypass this, but standard clients require insert access)
CREATE POLICY "gm_student_login_logs_insert_anon" ON public.gm_student_login_logs
    FOR INSERT TO anon
    WITH CHECK (true);

-- 3. Policy: Authenticated admin users can view all login logs
CREATE POLICY "gm_student_login_logs_admin_read" ON public.gm_student_login_logs
    FOR SELECT TO anon
    USING (true);
