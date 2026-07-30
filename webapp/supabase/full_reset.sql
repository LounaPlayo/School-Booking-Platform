-- ============================================================
-- FULL RESET — School Booking Platform Database
-- ============================================================
-- WARNING: This deletes ALL existing bookings, team profiles, and
-- pricing data. There is no undo. Only run this if you actually
-- want to start completely fresh.
--
-- After running this, you'll need to sign up again on the login
-- page (you'll automatically become the first Approver again,
-- same as the very first time).
-- ============================================================

-- ---------- Drop everything from before ----------

drop trigger if exists trg_enforce_booking_locks on public.bookings;
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.bookings cascade;
drop table if exists public.package_rates cascade;
drop table if exists public.profiles cascade;

drop function if exists public.enforce_booking_locks();
drop function if exists public.handle_new_user();


-- ---------- 1. Profiles (name + role for each login) ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'agent' check (role in ('agent', 'approver')),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;

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

grant select, insert, update, delete on public.bookings to authenticated;

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

create policy "Sealed bookings can never be deleted"
  on public.bookings for delete
  using (
    not (
      booking_status in ('Confirmed', 'Completed')
      and deposit_status = 'Received'
    )
  );

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


-- ---------- 3. Package Pricing ----------

create table public.package_rates (
  id uuid primary key default gen_random_uuid(),
  package_name text not null unique,
  rate numeric not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.package_rates to authenticated;

alter table public.package_rates enable row level security;

create policy "Any signed-in user can read package rates"
  on public.package_rates for select
  using (auth.uid() is not null);

create policy "Only approvers can add package rates"
  on public.package_rates for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'approver'));

create policy "Only approvers can edit package rates"
  on public.package_rates for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'approver'));

create policy "Only approvers can remove package rates"
  on public.package_rates for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'approver'));

insert into public.package_rates (package_name, rate) values
  ('Package A', 15),
  ('Package B', 12),
  ('Package C', 9);
