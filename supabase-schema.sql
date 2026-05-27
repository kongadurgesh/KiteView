-- ============================================================
-- KiteView — Supabase Database Schema
-- Run this in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)
-- ============================================================

-- 1. Portfolio table (one row per user, stores entire portfolio as JSON)
create table if not exists portfolios (
    user_id uuid primary key references auth.users on delete cascade,
    data jsonb not null default '{"positions": {}}',
    updated_at timestamptz not null default now()
);

-- 2. Watchlists table (one row per user, stores entire watchlist array as JSON)
create table if not exists watchlists (
    user_id uuid primary key references auth.users on delete cascade,
    data jsonb not null default '[]',
    updated_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS) — users can only access their own rows
-- ============================================================

alter table portfolios enable row level security;

alter table watchlists enable row level security;

create policy "Users manage their own portfolio" on portfolios for all using (auth.uid () = user_id)
with
    check (auth.uid () = user_id);

create policy "Users manage their own watchlists" on watchlists for all using (auth.uid () = user_id)
with
    check (auth.uid () = user_id);

-- ============================================================
-- Auth configuration notes (do these in the Dashboard, not SQL)
-- ============================================================
-- 1. Authentication → Providers → Email  → Enable
-- 2. Authentication → Providers → Google → Enable (needs OAuth client ID/secret)
-- 3. Authentication → Email Templates → enable "Confirm email" if desired
-- 4. Authentication → URL Configuration:
--      Site URL:        https://your-vercel-app.vercel.app
--      Redirect URLs:   https://your-vercel-app.vercel.app/**
--                       http://localhost:5173/**   (for local dev)
-- ============================================================