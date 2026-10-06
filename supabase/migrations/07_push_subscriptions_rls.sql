-- Migration 07: Dedicated push_subscriptions table with Row Level Security (RLS)
-- Purpose: Persist web-push credentials securely, bound to authenticated users, with strict RLS.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    pharmacy_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (deny-by-default)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can only read and manage their own push subscriptions
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 2: Backend service_role key has full access for push dispatch and maintenance
DROP POLICY IF EXISTS "Service role full access on push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role full access on push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Indices for rapid lookup by user and endpoint
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);
