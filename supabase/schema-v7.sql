-- ============ 博客 v7：留言板回复 ============
-- 在 Supabase 控制台 SQL Editor 中整体运行（需先运行 schema-v5.sql）

alter table public.guestbook add column if not exists parent_id uuid
  references public.guestbook(id) on delete cascade;

create index if not exists guestbook_parent_idx
  on public.guestbook (parent_id, created_at);

-- 博主只能由管理端（service_role，auth.uid() 为空）指定；
-- 普通登录用户不能把自己或其他账号改成 owner
create or replace function public.protect_owner_role()
returns trigger as $$
begin
  if new.role = 'owner' and coalesce(old.role, '') <> 'owner' and auth.uid() is not null then
    raise exception '只有博主本人可以指定博主';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_protect_owner_role on public.profiles;
create trigger trg_protect_owner_role
  before insert or update of role on public.profiles
  for each row execute function public.protect_owner_role();
