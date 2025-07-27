create table public.scenarios (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  graph_data jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint scenarios_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_scenarios_created_at on public.scenarios using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_scenarios_name on public.scenarios using btree (name) TABLESPACE pg_default;

create trigger update_scenarios_updated_at BEFORE
update on scenarios for EACH row
execute FUNCTION update_updated_at_column ();