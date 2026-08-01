-- 博客文章表（在 Supabase 控制台 SQL Editor 中运行）
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_published_created_idx
  on public.posts (published, created_at desc);

-- 开启行级安全：服务端使用 service_role key 可绕过 RLS
alter table public.posts enable row level security;
