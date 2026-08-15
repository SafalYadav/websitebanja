alter table public.projects
add column if not exists is_published boolean default false not null,
add column if not exists public_slug text unique,
add column if not exists published_at timestamp with time zone;

create policy "Published projects are viewable by everyone."
on public.projects for select
using (is_published = true);
