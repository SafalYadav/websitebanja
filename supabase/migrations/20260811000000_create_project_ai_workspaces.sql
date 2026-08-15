insert into storage.buckets (id, name, public)
values ('project-workspaces', 'project-workspaces', false)
on conflict (id) do nothing;

update storage.buckets
set public = false
where id = 'project-workspaces';

drop policy if exists "Users can manage their own AI workspaces" on storage.objects;
drop policy if exists "workspace_select" on storage.objects;
drop policy if exists "workspace_insert" on storage.objects;
drop policy if exists "workspace_update" on storage.objects;
drop policy if exists "workspace_delete" on storage.objects;

create policy "workspace_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-workspaces'
  and (storage.foldername(storage.objects.name))[2] = '.websitebanja'
  and exists (
    select 1 from public.projects as project
    where project.id::text = (storage.foldername(storage.objects.name))[1]
      and project.user_id = (select auth.uid())
  )
);

create policy "workspace_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-workspaces'
  and (storage.foldername(storage.objects.name))[2] = '.websitebanja'
  and exists (
    select 1 from public.projects as project
    where project.id::text = (storage.foldername(storage.objects.name))[1]
      and project.user_id = (select auth.uid())
  )
);

create policy "workspace_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'project-workspaces'
  and (storage.foldername(storage.objects.name))[2] = '.websitebanja'
  and exists (
    select 1 from public.projects as project
    where project.id::text = (storage.foldername(storage.objects.name))[1]
      and project.user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'project-workspaces'
  and (storage.foldername(storage.objects.name))[2] = '.websitebanja'
  and exists (
    select 1 from public.projects as project
    where project.id::text = (storage.foldername(storage.objects.name))[1]
      and project.user_id = (select auth.uid())
  )
);

create policy "workspace_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-workspaces'
  and (storage.foldername(storage.objects.name))[2] = '.websitebanja'
  and exists (
    select 1 from public.projects as project
    where project.id::text = (storage.foldername(storage.objects.name))[1]
      and project.user_id = (select auth.uid())
  )
);
