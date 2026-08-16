-- 闲语评论支持回复（串楼）：在 Supabase 控制台 SQL Editor 中运行
alter table public.moment_comments
  add column if not exists parent_id uuid references public.moment_comments(id) on delete cascade;

create index if not exists moment_comments_parent_idx
  on public.moment_comments (parent_id, created_at);
