-- Additive photo ordering support. Safe for existing rows.
alter table public.photos
  add column if not exists sort_order integer not null default 0;

create index if not exists photos_album_sort_idx
  on public.photos(album_id, sort_order, created_at desc);
