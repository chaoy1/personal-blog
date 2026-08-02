-- ============ 博客 v5：留言板 ============
-- 在 Supabase 控制台 SQL Editor 中整体运行（需先运行 schema-v2.sql / schema-v3.sql）

create table if not exists public.guestbook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists guestbook_created_idx on public.guestbook (created_at desc);

alter table public.guestbook enable row level security;

drop policy if exists "guestbook_select" on public.guestbook;
create policy "guestbook_select" on public.guestbook for select using (true);

drop policy if exists "guestbook_insert" on public.guestbook;
create policy "guestbook_insert" on public.guestbook for insert
  with check (auth.uid() = user_id);

drop policy if exists "guestbook_delete" on public.guestbook;
create policy "guestbook_delete" on public.guestbook for delete
  using (auth.uid() = user_id);
