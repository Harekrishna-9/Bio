-- =========================================================
-- HAREKRISHNA BIO ADMIN V5 UPGRADE
-- Run ONCE in Supabase SQL Editor.
-- Existing data remains safe.
-- =========================================================

-- PROFILE EDITOR
alter table public.profile_settings add column if not exists display_name text default 'Harekrishna Patel';
alter table public.profile_settings add column if not exists profession text default 'Web Creator • Tech Enthusiast • Inventory Professional';
alter table public.profile_settings add column if not exists location_text text default 'India';
alter table public.profile_settings add column if not exists profile_photo_url text;
alter table public.profile_settings add column if not exists verified boolean default true;

-- STORY EDITOR / DRAFTS
alter table public.stories add column if not exists is_draft boolean default false;
alter table public.stories add column if not exists updated_at timestamptz default now();

-- LINK REORDER
alter table public.profile_links add column if not exists sort_order integer default 0;

-- ANALYTICS helper indexes
create index if not exists idx_profile_views_created_at on public.profile_views(created_at);
create index if not exists idx_profile_likes_created_at on public.profile_likes(created_at);
create index if not exists idx_link_clicks_created_at on public.link_clicks(created_at);
create index if not exists idx_stories_created_at on public.stories(created_at);

grant select, insert, update, delete on public.profile_settings to authenticated;
grant select, insert, update, delete on public.stories to authenticated;
grant select, insert, update, delete on public.profile_links to authenticated;
