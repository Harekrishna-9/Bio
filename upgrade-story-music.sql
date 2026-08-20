alter table public.stories add column if not exists music_id uuid;
alter table public.stories add column if not exists music_url text;
alter table public.stories add column if not exists music_title text;
alter table public.stories add column if not exists music_start integer default 0;
alter table public.stories add column if not exists music_volume numeric default 0.8;
alter table public.stories add column if not exists audio_mode text default 'music';
grant select, insert, update, delete on public.stories to authenticated;
