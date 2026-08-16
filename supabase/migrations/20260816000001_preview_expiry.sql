alter table public.projects
add column if not exists preview_expires_at timestamp with time zone;
