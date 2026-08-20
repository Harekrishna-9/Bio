-- =========================================================
-- HAREKRISHNA BIO - FINAL SUPABASE SECURITY / ADMIN POLICIES
-- Run this AFTER your previous table + storage SQL.
-- Admin email: pharekrishna09@gmail.com
-- =========================================================

-- Helper expression used below:
-- (auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com'

-- PROFILE SETTINGS: admin can insert/update/delete
create policy "Admin insert profile settings"
on public.profile_settings for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin update profile settings"
on public.profile_settings for update
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com')
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin delete profile settings"
on public.profile_settings for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

-- STORIES
create policy "Admin manage stories insert"
on public.stories for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin manage stories update"
on public.stories for update
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com')
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin manage stories delete"
on public.stories for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

-- Authenticated admin must also be able to read all stories including expired ones
create policy "Admin read all stories"
on public.stories for select
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

-- HIGHLIGHTS
create policy "Admin insert highlights"
on public.highlights for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin update highlights"
on public.highlights for update
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com')
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin delete highlights"
on public.highlights for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

-- HIGHLIGHT ITEMS
create policy "Admin insert highlight items"
on public.highlight_items for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin update highlight items"
on public.highlight_items for update
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com')
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin delete highlight items"
on public.highlight_items for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

-- GALLERY
create policy "Admin insert gallery"
on public.gallery for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin update gallery"
on public.gallery for update
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com')
with check ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin delete gallery"
on public.gallery for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

-- GUEST MESSAGES: admin can read/delete, public still insert only
create policy "Admin read guest messages"
on public.guest_messages for select
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin delete guest messages"
on public.guest_messages for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

-- LINK CLICKS: admin can read
create policy "Admin read link clicks"
on public.link_clicks for select
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

-- PROFILE VIEWS / LIKES: admin can read too
create policy "Admin read profile views"
on public.profile_views for select
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

create policy "Admin read profile likes"
on public.profile_likes for select
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

-- STORAGE: replace older broad authenticated policies with admin-email restricted ones
drop policy if exists "Authenticated user can upload bio media" on storage.objects;
drop policy if exists "Authenticated user can update bio media" on storage.objects;
drop policy if exists "Authenticated user can delete bio media" on storage.objects;

create policy "Admin upload bio media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'bio-media'
  and (auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com'
);

create policy "Admin update bio media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'bio-media'
  and (auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com'
)
with check (
  bucket_id = 'bio-media'
  and (auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com'
);

create policy "Admin delete bio media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'bio-media'
  and (auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com'
);
