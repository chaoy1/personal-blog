-- ============ 博客 v4：性能索引（可选，数据多时建议运行） ============

create index if not exists moments_created_idx on public.moments (created_at desc);
create index if not exists photos_created_idx on public.photos (created_at desc);
create index if not exists comments_parent_idx on public.comments (parent_id);
create index if not exists moment_comments_moment_created_idx
  on public.moment_comments (moment_id, created_at);
