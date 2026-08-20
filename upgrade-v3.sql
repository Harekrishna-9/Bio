-- =========================================================
-- HAREKRISHNA BIO - ADMIN V3 DATABASE UPGRADE
-- Run this ONCE in Supabase SQL Editor.
-- Safe upgrade: adds columns/tables, does not delete your existing data.
-- =========================================================

-- 1) STORY SCHEDULING
alter table public.stories
add column if not exists starts_at timestamptz default now();

update public.stories
set starts_at = coalesce(starts_at, created_at, now())
where starts_at is null;

-- Public should only see stories that have started and have not expired.
drop policy if exists "Public can read active stories" on public.stories;
create policy "Public can read active stories"
on public.stories for select
to anon
using (
  coalesce(starts_at, created_at, now()) <= now()
  and expires_at > now()
);

-- 2) PROFILE STATUS + PINNED ANNOUNCEMENT
alter table public.profile_settings
add column if not exists profile_status text default 'Available';

alter table public.profile_settings
add column if not exists announcement_text text;

alter table public.profile_settings
add column if not exists announcement_enabled boolean default false;

-- 3) GALLERY ALBUMS
alter table public.gallery
add column if not exists album_name text default 'Memories';

-- 4) EDITABLE SOCIAL + PROJECT LINKS
create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  link_type text not null check (link_type in ('social','project')),
  title text not null,
  subtitle text,
  url text not null,
  icon text default '↗',
  sort_order integer default 0,
  enabled boolean default true,
  created_at timestamptz default now()
);

alter table public.profile_links enable row level security;

drop policy if exists "Public read profile links" on public.profile_links;
create policy "Public read profile links"
on public.profile_links for select
to anon
using (enabled = true);

drop policy if exists "Admin read profile links" on public.profile_links;
create policy "Admin read profile links"
on public.profile_links for select
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

drop policy if exists "Admin insert profile links" on public.profile_links;
create policy "Admin insert profile links"
on public.profile_links for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

drop policy if exists "Admin update profile links" on public.profile_links;
create policy "Admin update profile links"
on public.profile_links for update
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com')
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

drop policy if exists "Admin delete profile links" on public.profile_links;
create policy "Admin delete profile links"
on public.profile_links for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

grant select on public.profile_links to anon, authenticated;
grant insert, update, delete on public.profile_links to authenticated;

-- Seed your current links only when table is empty.
insert into public.profile_links (link_type,title,subtitle,url,icon,sort_order)
select * from (values
  ('social','Instagram','@user_9___','https://www.instagram.com/user_9___/','◎',10),
  ('social','Facebook','Connect','https://www.facebook.com/share/1CkzSXXGB4/?mibextid=wwXIfr','f',20),
  ('social','LinkedIn','Professional','https://www.linkedin.com/in/harekrishna-patel-20a221259','in',30),
  ('social','Email','pharekrishna09@gmail.com','mailto:pharekrishna09@gmail.com','✉',40),
  ('project','Prem Mart','Online grocery shopping experience','https://harekrishna-9.github.io/Prem-Mart/index.html','🛒',10),
  ('project','Rapid Job','Government jobs & useful tools','https://harekrishna-9.github.io/RapidJob/','💼',20),
  ('project','Personal Portfolio','Skills, experience & projects','https://harekrishna-9.github.io/krishnacv/','🌐',30)
) as v(link_type,title,subtitle,url,icon,sort_order)
where not exists (select 1 from public.profile_links);

-- 5) MULTIPLE MUSIC PLAYLIST + CLIP TIME 30-60 SEC
create table if not exists public.music_playlist (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  media_url text not null,
  clip_seconds integer not null default 30 check (clip_seconds between 30 and 60),
  sort_order integer default 0,
  enabled boolean default true,
  created_at timestamptz default now()
);

alter table public.music_playlist enable row level security;

drop policy if exists "Public read music playlist" on public.music_playlist;
create policy "Public read music playlist"
on public.music_playlist for select
to anon
using (enabled = true);

drop policy if exists "Admin read music playlist" on public.music_playlist;
create policy "Admin read music playlist"
on public.music_playlist for select
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

drop policy if exists "Admin insert music playlist" on public.music_playlist;
create policy "Admin insert music playlist"
on public.music_playlist for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

drop policy if exists "Admin update music playlist" on public.music_playlist;
create policy "Admin update music playlist"
on public.music_playlist for update
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com')
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

drop policy if exists "Admin delete music playlist" on public.music_playlist;
create policy "Admin delete music playlist"
on public.music_playlist for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

grant select on public.music_playlist to anon, authenticated;
grant insert, update, delete on public.music_playlist to authenticated;

-- Make sure authenticated admin can still update new columns.
grant select, insert, update, delete on public.profile_settings to authenticated;
grant select, insert, update, delete on public.stories to authenticated;
grant select, insert, update, delete on public.gallery to authenticated;
grant select, insert, update, delete on public.highlights to authenticated;
grant select, insert, update, delete on public.highlight_items to authenticated;
