-- Ideas Board — initial schema + RLS
-- Single shared workspace: all invited/authenticated friends can read
-- everything and write most things. No multi-tenant group table — see
-- PLAN.md for rationale.

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ============================================================
-- Tables
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_agent boolean not null default false,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'new'
    check (status in ('new','exploring','building','archived')),
  submitted_by uuid references profiles(id),
  source text not null default 'human' check (source in ('human','agent')),
  created_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table idea_tags (
  idea_id uuid not null references ideas(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (idea_id, tag_id)
);

create table reactions (
  idea_id uuid not null references ideas(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null default '👍',
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id, emoji)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- Custom personal API keys for agent access (Supabase has no built-in
-- RLS-respecting personal key — see PLAN.md Phase 3). Only the sha256 hash
-- is stored; the raw key is shown once at generation time in the app.
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  key_hash text not null unique,
  label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index ideas_project_id_idx on ideas(project_id);
create index ideas_status_idx on ideas(status);
create index comments_idea_id_idx on comments(idea_id);
create index api_keys_user_id_idx on api_keys(user_id);

-- ============================================================
-- profiles auto-provision on signup
-- Standard Supabase community pattern: trigger on auth.users insert.
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================

alter table profiles   enable row level security;
alter table projects   enable row level security;
alter table ideas      enable row level security;
alter table tags       enable row level security;
alter table idea_tags  enable row level security;
alter table reactions  enable row level security;
alter table comments   enable row level security;
alter table api_keys   enable row level security;

-- profiles: any authenticated member can see everyone (for attribution);
-- only own row is writable.
create policy "profiles_select_all" on profiles
  for select to authenticated
  using (true);

create policy "profiles_update_own" on profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- projects: any member can read/create; only creator can update/delete.
create policy "projects_select_all" on projects
  for select to authenticated
  using (true);

create policy "projects_insert_own" on projects
  for insert to authenticated
  with check ((select auth.uid()) = created_by);

create policy "projects_update_own" on projects
  for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "projects_delete_own" on projects
  for delete to authenticated
  using ((select auth.uid()) = created_by);

-- ideas: any member can read/create; any member can update (status changes
-- etc — shared trust within the friend group); no delete policy (use
-- status='archived' instead of destructive delete).
create policy "ideas_select_all" on ideas
  for select to authenticated
  using (true);

create policy "ideas_insert_own" on ideas
  for insert to authenticated
  with check ((select auth.uid()) = submitted_by);

create policy "ideas_update_all" on ideas
  for update to authenticated
  using (true)
  with check (true);

-- tags / idea_tags: any member can read/create/tag.
create policy "tags_select_all" on tags
  for select to authenticated
  using (true);

create policy "tags_insert_all" on tags
  for insert to authenticated
  with check (true);

create policy "idea_tags_select_all" on idea_tags
  for select to authenticated
  using (true);

create policy "idea_tags_insert_all" on idea_tags
  for insert to authenticated
  with check (true);

create policy "idea_tags_delete_all" on idea_tags
  for delete to authenticated
  using (true);

-- reactions: any member can read; only manage own reaction rows.
create policy "reactions_select_all" on reactions
  for select to authenticated
  using (true);

create policy "reactions_insert_own" on reactions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "reactions_delete_own" on reactions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- comments: any member can read; only manage own comments.
create policy "comments_select_all" on comments
  for select to authenticated
  using (true);

create policy "comments_insert_own" on comments
  for insert to authenticated
  with check ((select auth.uid()) = author_id);

create policy "comments_update_own" on comments
  for update to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "comments_delete_own" on comments
  for delete to authenticated
  using ((select auth.uid()) = author_id);

-- api_keys: strictly private to the owning user. Server code that validates
-- agent requests uses the service_role key, which bypasses RLS by design —
-- these policies only govern access from the browser client.
create policy "api_keys_select_own" on api_keys
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "api_keys_insert_own" on api_keys
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "api_keys_delete_own" on api_keys
  for delete to authenticated
  using ((select auth.uid()) = user_id);
