-- =====================================================================
-- MedTracker — Supabase schema (PostgreSQL)
-- Run in: Supabase Dashboard → SQL Editor (or `supabase db push` migration)
-- Includes: enums, tables, foreign keys, indexes, RLS policies, triggers.
-- Security model: every row belongs to a patient; a patient belongs to a
-- caregiver (profiles.id = auth.uid()). Shared access via care_team.
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------- Enums ----------
do $$ begin
  create type care_role     as enum ('family', 'professional', 'self');
  exception when duplicate_object then null; end $$;
do $$ begin
  create type team_role     as enum ('manager', 'viewer');
  exception when duplicate_object then null; end $$;
do $$ begin
  create type dose_status   as enum ('taken', 'missed', 'pending');
  exception when duplicate_object then null; end $$;
do $$ begin
  create type vital_type    as enum ('bp', 'hr', 'weight', 'glucose', 'temp', 'spo2');
  exception when duplicate_object then null; end $$;
do $$ begin
  create type contact_type  as enum ('emergency', 'doctor');
  exception when duplicate_object then null; end $$;

-- =====================================================================
-- 1) profiles — one row per authenticated caregiver (1:1 with auth.users)
-- =====================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default '',
  email        text,
  role         care_role not null default 'family',
  language     text not null default 'he',
  text_size    text not null default 'regular',
  theme        text not null default 'classic',
  dark_mode    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- =====================================================================
-- 2) patients — the person being cared for (owned by a caregiver)
-- =====================================================================
create table if not exists public.patients (
  id               uuid primary key default gen_random_uuid(),
  caregiver_id     uuid not null references public.profiles(id) on delete cascade,
  full_name        text not null,
  possessive_nick  text default 'אבא',           -- "התרופות של אבא"
  birth_date       date,
  blood_type       text,
  weight           text,
  height           text,
  allergies        text[] not null default '{}',
  conditions       text[] not null default '{}',
  notes            text default '',
  created_at       timestamptz not null default now()
);
create index if not exists idx_patients_caregiver on public.patients(caregiver_id);

-- =====================================================================
-- 3) care_team — additional people who can view/manage a patient
-- =====================================================================
create table if not exists public.care_team (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  profile_id   uuid references public.profiles(id) on delete set null, -- null = invited, not yet registered
  name         text not null,
  relation     text default 'בן/בת משפחה',
  role         team_role not null default 'viewer',
  is_primary   boolean not null default false,
  invited_email text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_care_team_patient on public.care_team(patient_id);
create index if not exists idx_care_team_profile on public.care_team(profile_id);

-- =====================================================================
-- 4) medications
-- =====================================================================
create table if not exists public.medications (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  name         text not null,
  dose         text default '',
  color        text default '#3B82F6',
  qty          integer not null default 0 check (qty >= 0),
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_meds_patient on public.medications(patient_id);

-- 4b) medication_times — reminder times per medication (normalized)
create table if not exists public.medication_times (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references public.medications(id) on delete cascade,
  time_of_day    time not null,                       -- 08:00, 20:00...
  unique (medication_id, time_of_day)
);
create index if not exists idx_medtimes_med on public.medication_times(medication_id);

-- =====================================================================
-- 5) doses — every scheduled/recorded intake
-- =====================================================================
create table if not exists public.doses (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references public.medications(id) on delete cascade,
  scheduled_at   timestamptz not null,
  status         dose_status not null default 'pending',
  taken_at       timestamptz,
  created_at     timestamptz not null default now(),
  unique (medication_id, scheduled_at)
);
create index if not exists idx_doses_med on public.doses(medication_id);
create index if not exists idx_doses_sched on public.doses(scheduled_at);

-- =====================================================================
-- 6) vitals — blood pressure, heart rate, weight, glucose, temp, spo2
-- =====================================================================
create table if not exists public.vitals (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  type         vital_type not null,
  systolic     numeric,                 -- bp only
  diastolic    numeric,                 -- bp only
  value        numeric,                 -- single-value vitals
  notes        text default '',
  recorded_at  timestamptz not null default now()
);
create index if not exists idx_vitals_patient on public.vitals(patient_id, type, recorded_at desc);

-- =====================================================================
-- 7) journal_entries + journal_symptoms
-- =====================================================================
create table if not exists public.journal_entries (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.patients(id) on delete cascade,
  medication_id  uuid references public.medications(id) on delete set null,
  body           text not null,
  recorded_at    timestamptz not null default now()
);
create index if not exists idx_journal_patient on public.journal_entries(patient_id, recorded_at desc);

create table if not exists public.journal_symptoms (
  id          uuid primary key default gen_random_uuid(),
  journal_id  uuid not null references public.journal_entries(id) on delete cascade,
  symptom     text not null            -- pain, dizziness, nausea, fatigue...
);
create index if not exists idx_symptoms_journal on public.journal_symptoms(journal_id);

-- =====================================================================
-- 8) mood_logs — one per patient per day
-- =====================================================================
create table if not exists public.mood_logs (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  log_date     date not null default current_date,
  mood         text not null,           -- excellent/good/okay/bad/awful
  label        text,
  unique (patient_id, log_date)
);

-- =====================================================================
-- 9) achievements — unlocked milestones
-- =====================================================================
create table if not exists public.achievements (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients(id) on delete cascade,
  achievement_key  text not null,       -- first_dose, week_streak...
  unlocked_at      timestamptz not null default now(),
  unique (patient_id, achievement_key)
);

-- =====================================================================
-- 10) contacts — emergency contact + treating doctor (ICE)
-- =====================================================================
create table if not exists public.contacts (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients(id) on delete cascade,
  type         contact_type not null,
  name         text not null,
  phone        text,
  relation     text,                    -- emergency contact relation
  clinic       text,                    -- doctor clinic
  created_at   timestamptz not null default now()
);
create index if not exists idx_contacts_patient on public.contacts(patient_id);

-- =====================================================================
-- Auto-create a profile row when a new auth user signs up
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- ROW LEVEL SECURITY
-- A caregiver sees a patient if they own it OR are on its care_team.
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.patients          enable row level security;
alter table public.care_team         enable row level security;
alter table public.medications       enable row level security;
alter table public.medication_times  enable row level security;
alter table public.doses             enable row level security;
alter table public.vitals            enable row level security;
alter table public.journal_entries   enable row level security;
alter table public.journal_symptoms  enable row level security;
alter table public.mood_logs         enable row level security;
alter table public.achievements      enable row level security;
alter table public.contacts          enable row level security;

-- Helper: can the current user access this patient?
create or replace function public.can_access_patient(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.patients pt where pt.id = p_id and pt.caregiver_id = auth.uid()
  ) or exists (
    select 1 from public.care_team ct where ct.patient_id = p_id and ct.profile_id = auth.uid()
  );
$$;

-- profiles: a user manages only their own profile row
create policy "profiles_self" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- patients: caregiver owns; care_team can read
create policy "patients_owner_all" on public.patients
  for all using (caregiver_id = auth.uid()) with check (caregiver_id = auth.uid());
create policy "patients_team_read" on public.patients
  for select using (public.can_access_patient(id));

-- Generic pattern for child tables keyed by patient_id
create policy "care_team_access"        on public.care_team        for all using (public.can_access_patient(patient_id)) with check (public.can_access_patient(patient_id));
create policy "medications_access"      on public.medications      for all using (public.can_access_patient(patient_id)) with check (public.can_access_patient(patient_id));
create policy "vitals_access"           on public.vitals           for all using (public.can_access_patient(patient_id)) with check (public.can_access_patient(patient_id));
create policy "journal_access"          on public.journal_entries  for all using (public.can_access_patient(patient_id)) with check (public.can_access_patient(patient_id));
create policy "mood_access"             on public.mood_logs        for all using (public.can_access_patient(patient_id)) with check (public.can_access_patient(patient_id));
create policy "achievements_access"     on public.achievements     for all using (public.can_access_patient(patient_id)) with check (public.can_access_patient(patient_id));
create policy "contacts_access"         on public.contacts         for all using (public.can_access_patient(patient_id)) with check (public.can_access_patient(patient_id));

-- Tables keyed via a parent (medication / journal) — check through the join
create policy "medtimes_access" on public.medication_times for all
  using (exists (select 1 from public.medications m where m.id = medication_id and public.can_access_patient(m.patient_id)))
  with check (exists (select 1 from public.medications m where m.id = medication_id and public.can_access_patient(m.patient_id)));

create policy "doses_access" on public.doses for all
  using (exists (select 1 from public.medications m where m.id = medication_id and public.can_access_patient(m.patient_id)))
  with check (exists (select 1 from public.medications m where m.id = medication_id and public.can_access_patient(m.patient_id)));

create policy "symptoms_access" on public.journal_symptoms for all
  using (exists (select 1 from public.journal_entries j where j.id = journal_id and public.can_access_patient(j.patient_id)))
  with check (exists (select 1 from public.journal_entries j where j.id = journal_id and public.can_access_patient(j.patient_id)));
