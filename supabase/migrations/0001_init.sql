-- JARVIS MVP schema (see docs/architecture/JARVIS_Architecture.md §17-18)
-- UUID PKs, created_at/updated_at everywhere, soft-delete on user-generated content.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type food_source as enum ('verified', 'user_created', 'ai_estimated');
create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type input_source as enum ('text', 'photo', 'manual');
create type nutrition_confidence as enum ('verified', 'estimated');
create type exercise_category as enum ('strength', 'cardio', 'mobility', 'other');
create type memory_category as enum ('goal', 'equipment', 'preference', 'constraint', 'observation');

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- user_profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_profiles_updated_at
  before update on user_profiles
  for each row execute function set_updated_at();

-- Auto-provision a user_profiles row whenever a new Supabase Auth user is
-- created, so the backend never has to special-case "profile doesn't exist
-- yet" on first login.
create function handle_new_auth_user() returns trigger as $$
begin
  insert into public.user_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calorie_target numeric,
  protein_target_g numeric,
  carb_target_g numeric,
  fat_target_g numeric,
  weight_goal_kg numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_goals_user_active on goals (user_id, active);

create trigger trg_goals_updated_at
  before update on goals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- foods / food_servings (reference data; default_serving_id FK added after
-- food_servings exists to resolve the circular reference)
-- ---------------------------------------------------------------------------
create table foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source food_source not null default 'user_created',
  default_serving_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, source)
);

create table food_servings (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references foods(id) on delete cascade,
  serving_description text not null,
  calories numeric not null,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_food_servings_food_id on food_servings (food_id);

alter table foods
  add constraint fk_foods_default_serving
  foreign key (default_serving_id) references food_servings(id) on delete set null;

create trigger trg_foods_updated_at
  before update on foods
  for each row execute function set_updated_at();

create trigger trg_food_servings_updated_at
  before update on food_servings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- meals / meal_items
-- ---------------------------------------------------------------------------
create table meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_type meal_type not null,
  input_source input_source not null,
  raw_input text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_meals_user_logged_at on meals (user_id, logged_at);

create trigger trg_meals_updated_at
  before update on meals
  for each row execute function set_updated_at();

-- Nutrition values are snapshotted at log time (§18) -- not recomputed from
-- food_servings later, so historical logs stay accurate even if reference
-- data is corrected afterward.
create table meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  food_id uuid not null references foods(id),
  serving_id uuid not null references food_servings(id),
  quantity numeric not null,
  nutrition_confidence nutrition_confidence not null default 'verified',
  calories numeric not null,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_meal_items_meal_id on meal_items (meal_id);

create trigger trg_meal_items_updated_at
  before update on meal_items
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- exercises / workout_sessions / workout_exercises / workout_sets
-- ---------------------------------------------------------------------------
create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category exercise_category not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_exercises_updated_at
  before update on exercises
  for each row execute function set_updated_at();

create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_workout_sessions_user_started_at on workout_sessions (user_id, started_at);

create trigger trg_workout_sessions_updated_at
  before update on workout_sessions
  for each row execute function set_updated_at();

create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_workout_exercises_session_id on workout_exercises (session_id);

create trigger trg_workout_exercises_updated_at
  before update on workout_exercises
  for each row execute function set_updated_at();

create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_number int not null,
  reps int,
  weight_kg numeric,
  duration_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_workout_sets_workout_exercise_id on workout_sets (workout_exercise_id);

create trigger trg_workout_sets_updated_at
  before update on workout_sets
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- body_metrics
-- ---------------------------------------------------------------------------
-- metric_type is free text (not an enum) since the reference list
-- (weight/waist/chest/...) is explicitly open-ended in §17.
create table body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  metric_type text not null,
  value numeric not null,
  unit text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_body_metrics_user_type_recorded on body_metrics (user_id, metric_type, recorded_at);

create trigger trg_body_metrics_updated_at
  before update on body_metrics
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- user_memory
-- ---------------------------------------------------------------------------
create table user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category memory_category not null,
  key text not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, key)
);

create index idx_user_memory_user_category on user_memory (user_id, category);

create trigger trg_user_memory_updated_at
  before update on user_memory
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- daily_summaries (cached aggregation)
-- ---------------------------------------------------------------------------
create table daily_summaries (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  total_calories numeric not null default 0,
  total_protein_g numeric not null default 0,
  total_carbs_g numeric not null default 0,
  total_fat_g numeric not null default 0,
  workout_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create trigger trg_daily_summaries_updated_at
  before update on daily_summaries
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Backend connects with the service-role key and bypasses RLS by design
-- (ownership is enforced in application services per §26); these policies
-- are a defense-in-depth backstop against any direct client/anon access.
-- ---------------------------------------------------------------------------
alter table user_profiles enable row level security;
alter table goals enable row level security;
alter table meals enable row level security;
alter table meal_items enable row level security;
alter table workout_sessions enable row level security;
alter table workout_exercises enable row level security;
alter table workout_sets enable row level security;
alter table body_metrics enable row level security;
alter table user_memory enable row level security;
alter table daily_summaries enable row level security;
alter table foods enable row level security;
alter table food_servings enable row level security;
alter table exercises enable row level security;

create policy "own profile" on user_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own goals" on goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own meals" on meals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own meal items" on meal_items
  for all using (
    exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid())
  );

create policy "own workout sessions" on workout_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own workout exercises" on workout_exercises
  for all using (
    exists (select 1 from workout_sessions s where s.id = session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from workout_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

create policy "own workout sets" on workout_sets
  for all using (
    exists (
      select 1 from workout_exercises we
      join workout_sessions s on s.id = we.session_id
      where we.id = workout_exercise_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from workout_exercises we
      join workout_sessions s on s.id = we.session_id
      where we.id = workout_exercise_id and s.user_id = auth.uid()
    )
  );

create policy "own body metrics" on body_metrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own memory" on user_memory
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own daily summaries" on daily_summaries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reference data: readable by any authenticated user, writable by any
-- authenticated user (users/AI can add user_created foods per §22).
create policy "read foods" on foods for select using (auth.role() = 'authenticated');
create policy "insert foods" on foods for insert with check (auth.role() = 'authenticated');

create policy "read food servings" on food_servings for select using (auth.role() = 'authenticated');
create policy "insert food servings" on food_servings for insert with check (auth.role() = 'authenticated');

create policy "read exercises" on exercises for select using (auth.role() = 'authenticated');
create policy "insert exercises" on exercises for insert with check (auth.role() = 'authenticated');
