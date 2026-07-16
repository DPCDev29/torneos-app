alter table public.tournaments add column public_token text;

create policy tournaments_select_public on public.tournaments for select using (
  public_token is not null and public_token = current_setting('request.headers', true)::json->>'x-public-token'
);

create policy participants_select_public on public.participants for select using (
  exists (
    select 1 from public.tournaments
    where id = participants.tournament_id
      and public_token is not null
      and public_token = current_setting('request.headers', true)::json->>'x-public-token'
  )
);

create policy groups_select_public on public.groups for select using (
  exists (
    select 1 from public.tournaments
    where id = groups.tournament_id
      and public_token is not null
      and public_token = current_setting('request.headers', true)::json->>'x-public-token'
  )
);

create policy matches_select_public on public.matches for select using (
  exists (
    select 1 from public.tournaments
    where id = matches.tournament_id
      and public_token is not null
      and public_token = current_setting('request.headers', true)::json->>'x-public-token'
  )
);
