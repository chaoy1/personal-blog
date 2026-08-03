-- ============ 博客 v6：多相册 ============
-- 在 Supabase 控制台 SQL Editor 中整体运行（需先运行 schema-v2.sql）

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  cover_url text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists albums_created_idx on public.albums (created_at desc);

alter table public.albums enable row level security;

drop policy if exists "albums_select" on public.albums;
create policy "albums_select" on public.albums for select using (true);

drop policy if exists "albums_insert" on public.albums;
create policy "albums_insert" on public.albums for insert
  with check (auth.uid() = user_id);

drop policy if exists "albums_update" on public.albums;
create policy "albums_update" on public.albums for update
  using (auth.uid() = user_id);

drop policy if exists "albums_delete" on public.albums;
create policy "albums_delete" on public.albums for delete
  using (auth.uid() = user_id);

alter table public.photos add column if not exists album_id uuid
  references public.albums(id) on delete set null;

create index if not exists photos_album_idx on public.photos (album_id, created_at);
