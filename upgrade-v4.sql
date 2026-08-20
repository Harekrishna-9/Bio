-- =========================================================
-- HAREKRISHNA BIO - V4 HIGHLIGHT MANAGER UPGRADE
-- Run ONCE in Supabase SQL Editor after V3 SQL.
-- Existing data remains safe.
-- =========================================================

-- Ordering support
alter table public.highlights
add column if not exists sort_order integer default 0;

alter table public.highlight_items
add column if not exists sort_order integer default 0;

alter table public.gallery
add column if not exists sort_order integer default 0;

-- Highlight analytics
create table if not exists public.highlight_views (
  id uuid primary key default gen_random_uuid(),
  highlight_id uuid not null references public.highlights(id) on delete cascade,
  visitor_id text,
  created_at timestamptz default now()
);

alter table public.highlight_views enable row level security;

drop policy if exists "Public add highlight views" on public.highlight_views;
create policy "Public add highlight views"
on public.highlight_views for insert
to anon
with check (true);

drop policy if exists "Admin read highlight views" on public.highlight_views;
create policy "Admin read highlight views"
on public.highlight_views for select
to authenticated
using ((auth.jwt() ->> 'email') = 'pharekrishna09@gmail.com');

grant insert on public.highlight_views to anon;
grant select on public.highlight_views to authenticated;

-- Admin can update ordering and content.
grant select, insert, update, delete on public.highlights to authenticated;
grant select, insert, update, delete on public.highlight_items to authenticated;
grant select, insert, update, delete on public.gallery to authenticated;

-- RPC: delete/update highlight (secure and reliable)
create or replace function public.admin_delete_highlight(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from 'd915ff81-9bb9-4ff9-bab9-4ddd44f5793c'::uuid then
    raise exception 'Not authorized';
  end if;
  delete from public.highlights where id = p_id;
  return found;
end;
$$;

create or replace function public.admin_update_highlight(
  p_id uuid, p_name text, p_emoji text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from 'd915ff81-9bb9-4ff9-bab9-4ddd44f5793c'::uuid then
    raise exception 'Not authorized';
  end if;
  update public.highlights
     set name = p_name, emoji = p_emoji
   where id = p_id;
  return found;
end;
$$;

-- RPC: highlight item delete / reorder
create or replace function public.admin_delete_highlight_item(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from 'd915ff81-9bb9-4ff9-bab9-4ddd44f5793c'::uuid then
    raise exception 'Not authorized';
  end if;
  delete from public.highlight_items where id = p_id;
  return found;
end;
$$;

create or replace function public.admin_set_highlight_item_order(p_id uuid, p_sort integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from 'd915ff81-9bb9-4ff9-bab9-4ddd44f5793c'::uuid then
    raise exception 'Not authorized';
  end if;
  update public.highlight_items set sort_order = p_sort where id = p_id;
  return found;
end;
$$;

revoke all on function public.admin_delete_highlight_item(uuid) from public;
revoke all on function public.admin_set_highlight_item_order(uuid,integer) from public;
grant execute on function public.admin_delete_highlight_item(uuid) to authenticated;
grant execute on function public.admin_set_highlight_item_order(uuid,integer) to authenticated;
