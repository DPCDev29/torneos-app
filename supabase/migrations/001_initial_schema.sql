create table public.tournaments (
  id text primary key,
  name text not null,
  start_date text not null,
  end_date text not null default '',
  venue text not null,
  format text not null,
  court_names jsonb not null default '[]'::jsonb,
  match_duration_minutes integer not null,
  sets_to_win integer not null,
  include_grand_final boolean,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_members (
  tournament_id text not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  primary key (tournament_id, user_id)
);

create table public.participants (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  name text not null,
  contact text,
  representative text,
  color text not null,
  level text,
  ranking integer,
  is_seeded boolean,
  created_at timestamptz not null default now()
);

create table public.groups (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  name text not null,
  participant_ids jsonb not null default '[]'::jsonb
);

create table public.matches (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  stage text not null,
  group_id text,
  round integer not null,
  position integer not null,
  scheduled_at text not null default '',
  court_name text not null default '',
  home_participant_id text not null default '',
  away_participant_id text not null default '',
  sets jsonb,
  winner_participant_id text,
  next_match_id text,
  next_match_slot text,
  loser_next_match_id text,
  loser_next_match_slot text,
  is_bye boolean
);

create index participants_tournament_id_idx on public.participants(tournament_id);
create index groups_tournament_id_idx on public.groups(tournament_id);
create index matches_tournament_id_idx on public.matches(tournament_id);
create index tournament_members_user_id_idx on public.tournament_members(user_id);

create or replace function public.has_tournament_role(target_tournament_id text, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tournament_members
    where tournament_id = target_tournament_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create or replace function public.add_tournament_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tournament_members(tournament_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create trigger tournaments_add_owner
after insert on public.tournaments
for each row execute function public.add_tournament_owner();

alter table public.tournaments enable row level security;
alter table public.tournament_members enable row level security;
alter table public.participants enable row level security;
alter table public.groups enable row level security;
alter table public.matches enable row level security;

create policy tournaments_select on public.tournaments for select using (public.has_tournament_role(id, array['admin', 'editor', 'viewer']));
create policy tournaments_insert on public.tournaments for insert with check (created_by = auth.uid());
create policy tournaments_update on public.tournaments for update using (public.has_tournament_role(id, array['admin']));
create policy tournaments_delete on public.tournaments for delete using (public.has_tournament_role(id, array['admin']));

create policy tournament_members_select on public.tournament_members for select using (user_id = auth.uid());
create policy tournament_members_manage on public.tournament_members for all using (public.has_tournament_role(tournament_id, array['admin'])) with check (public.has_tournament_role(tournament_id, array['admin']));

create policy participants_select on public.participants for select using (public.has_tournament_role(tournament_id, array['admin', 'editor', 'viewer']));
create policy participants_manage on public.participants for all using (public.has_tournament_role(tournament_id, array['admin', 'editor'])) with check (public.has_tournament_role(tournament_id, array['admin', 'editor']));

create policy groups_select on public.groups for select using (public.has_tournament_role(tournament_id, array['admin', 'editor', 'viewer']));
create policy groups_manage on public.groups for all using (public.has_tournament_role(tournament_id, array['admin', 'editor'])) with check (public.has_tournament_role(tournament_id, array['admin', 'editor']));

create policy matches_select on public.matches for select using (public.has_tournament_role(tournament_id, array['admin', 'editor', 'viewer']));
create policy matches_manage on public.matches for all using (public.has_tournament_role(tournament_id, array['admin', 'editor'])) with check (public.has_tournament_role(tournament_id, array['admin', 'editor']));

alter publication supabase_realtime add table public.tournaments, public.participants, public.groups, public.matches;
