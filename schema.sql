-- ============================================================
-- School Booking Platform — Database Schema
-- ============================================================
-- Paste this entire file into Supabase's SQL Editor and run it
-- once, right after creating your project. It sets up:
--   1. A profiles table (name + role, linked to Supabase Auth)
--   2. A bookings table
--   3. Row Level Security so only signed-in team members can
--      see/use bookings
--   4. A trigger that blocks Agents from editing Booking Status
--      or Deposit Status once they're locked (Confirmed /
--      Received) - Approvers can still edit them
--   5. A policy that makes DELETE physically impossible at the
--      database level once a booking is sealed (Confirmed or
--      Completed AND Deposit Received) - this is enforced by
--      Postgres itself, not by the app, so it can't be bypassed
--      from the browser.
-- ============================================================

-- ---------- 1. Profiles (name + role for each login) ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'agent' check (role in ('agent', 'approver')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Any signed-in user can read all profiles"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "A user can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Approvers can update any profile; users can update their own name"
  on public.profiles for update
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'approver')
  );

-- Automatically create a profile row whenever someone signs up.
-- The very first person to sign up becomes an Approver; everyone
-- after that starts as an Agent (an Approver can promote them
-- later from the Team page).
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when is_first then 'approver' else 'agent' end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------- 2. Bookings ----------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  venue text not null check (venue in ('Playo', 'Oh Chateau')),
  school_name text not null,
  contact_person text,
  phone text,
  email text,
  event_date date,
  event_time text,
  event_type text,
  grade_level text,
  number_of_students numeric,
  number_of_chaperones numeric,
  package_selected text,
  total_price numeric,
  deposit_required numeric,
  deposit_status text not null default 'Not Requested'
    check (deposit_status in ('Not Requested', 'Requested', 'Partial', 'Received')),
  deposit_amount_received numeric,
  deposit_date date,
  booking_status text not null default 'Tentative'
    check (booking_status in ('Tentative', 'Deposit Pending', 'Confirmed', 'Completed', 'Not Interested', 'Cancelled')),
  team_assigned text,
  consent_forms_received text default 'No' check (consent_forms_received in ('Yes', 'No')),
  notes text,
  follow_up_date date,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Any signed-in user can read all bookings"
  on public.bookings for select
  using (auth.uid() is not null);

create policy "Any signed-in user can create a booking"
  on public.bookings for insert
  with check (auth.uid() is not null);

create policy "Any signed-in user can update a booking (locks enforced by trigger below)"
  on public.bookings for update
  using (auth.uid() is not null);

-- THE CORE RULE: a sealed booking (Confirmed/Completed AND Deposit
-- Received) can never be deleted by anyone, including Approvers.
-- This is a database policy, not an app check - it holds even if
-- someone bypasses the app entirely.
create policy "Sealed bookings can never be deleted"
  on public.bookings for delete
  using (
    not (
      booking_status in ('Confirmed', 'Completed')
      and deposit_status = 'Received'
    )
  );

-- Column-level lock: once Booking Status is Confirmed/Completed,
-- or Deposit Status is Received, only an Approver can change that
-- specific field going forward.
create or replace function public.enforce_booking_locks()
returns trigger as $$
declare
  acting_role text;
begin
  select role into acting_role from public.profiles where id = auth.uid();

  if coalesce(acting_role, 'agent') <> 'approver' then
    if old.booking_status in ('Confirmed', 'Completed')
       and new.booking_status is distinct from old.booking_status then
      raise exception 'Booking Status is locked. Only an approver can change it.';
    end if;

    if old.deposit_status = 'Received'
       and new.deposit_status is distinct from old.deposit_status then
      raise exception 'Deposit Status is locked. Only an approver can change it.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_enforce_booking_locks
  before update on public.bookings
  for each row execute function public.enforce_booking_locks();
