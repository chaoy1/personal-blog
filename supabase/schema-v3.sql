-- ============ 博客 v3：说说权限 / 说说评论 / 点赞 ============
-- 在 Supabase 控制台 SQL Editor 中整体运行（需先运行 schema-v2.sql）

-- 说说只能由博主发布
drop policy if exists "moments_insert" on public.moments;
create policy "moments_insert" on public.moments for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

-- 说说的图片上传也只能博主操作
drop policy if exists "moments_insert" on storage.objects;
create policy "moments_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'moments'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );
drop policy if exists "moments_delete" on storage.objects;
create policy "moments_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'moments'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

-- 说说评论
create table if not exists public.moment_comments (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists moment_comments_moment_idx on public.moment_comments (moment_id, created_at);
alter table public.moment_comments enable row level security;
drop policy if exists "moment_comments_select" on public.moment_comments;
create policy "moment_comments_select" on public.moment_comments for select using (true);
drop policy if exists "moment_comments_insert" on public.moment_comments;
create policy "moment_comments_insert" on public.moment_comments for insert
  with check (auth.uid() = user_id);
drop policy if exists "moment_comments_delete" on public.moment_comments;
create policy "moment_comments_delete" on public.moment_comments for delete
  using (auth.uid() = user_id);

-- 点赞
create table if not exists public.moment_likes (
  moment_id uuid not null references public.moments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (moment_id, user_id)
);
alter table public.moment_likes enable row level security;
drop policy if exists "moment_likes_select" on public.moment_likes;
create policy "moment_likes_select" on public.moment_likes for select using (true);
drop policy if exists "moment_likes_insert" on public.moment_likes;
create policy "moment_likes_insert" on public.moment_likes for insert
  with check (auth.uid() = user_id);
drop policy if exists "moment_likes_delete" on public.moment_likes;
create policy "moment_likes_delete" on public.moment_likes for delete
  using (auth.uid() = user_id);
