-- ============ 博客 v2：用户 / 评论 / 说说 / 相册 ============
-- 在 Supabase 控制台 SQL Editor 中整体运行

-- 用户资料
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  role text not null default 'user',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- 文章评论
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_slug_idx on public.comments (post_slug, created_at);
alter table public.comments enable row level security;
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments for select using (true);
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert with check (auth.uid() = user_id);
drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments for delete using (auth.uid() = user_id);

-- 说说（短动态，可配图）
create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.moments enable row level security;
drop policy if exists "moments_select" on public.moments;
create policy "moments_select" on public.moments for select using (true);
drop policy if exists "moments_insert" on public.moments;
create policy "moments_insert" on public.moments for insert with check (auth.uid() = user_id);
drop policy if exists "moments_delete" on public.moments;
create policy "moments_delete" on public.moments for delete using (auth.uid() = user_id);

-- 相册
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);
alter table public.photos enable row level security;
drop policy if exists "photos_select" on public.photos;
create policy "photos_select" on public.photos for select using (true);
drop policy if exists "photos_insert" on public.photos;
create policy "photos_insert" on public.photos for insert with check (auth.uid() = user_id);
drop policy if exists "photos_delete" on public.photos;
create policy "photos_delete" on public.photos for delete using (auth.uid() = user_id);

-- 存储桶（头像 / 相册 / 说说配图）
insert into storage.buckets (id, name, public) values ('avatars','avatars',true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('photos','photos',true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('moments','moments',true) on conflict (id) do update set public = true;

drop policy if exists "avatars_insert" on storage.objects;
create policy "avatars_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_delete" on storage.objects;
create policy "avatars_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos_insert" on storage.objects;
create policy "photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "photos_delete" on storage.objects;
create policy "photos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "moments_insert" on storage.objects;
create policy "moments_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "moments_delete" on storage.objects;
create policy "moments_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
