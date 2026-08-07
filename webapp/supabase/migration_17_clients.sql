-- ============================================================
-- Migration 17: Client database
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- Creates a proper Clients table instead of every booking storing
-- its own disconnected copy of school name/contact/phone/email.
-- Existing bookings are automatically linked to a client record
-- (grouped by matching school name), so nothing existing breaks -
-- the booking form still shows the same fields, they're just backed
-- by a shared client record now, searchable and reusable across
-- future bookings.
-- ============================================================

-- ---------- 1. Clients table ----------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.clients to authenticated;

alter table public.clients enable row level security;

create policy "Any signed-in user can read clients"
  on public.clients for select
  using (auth.uid() is not null);

create policy "Any signed-in user can create a client"
  on public.clients for insert
  with check (auth.uid() is not null);

create policy "Any signed-in user can update a client"
  on public.clients for update
  using (auth.uid() is not null);

-- Deleting a client record is approver-only, same caution as
-- deleting anything else in the system.
create policy "Only approvers can delete clients"
  on public.clients for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'approver')
  );

-- ---------- 2. Link bookings to clients ----------

alter table public.bookings add column client_id uuid references public.clients(id);

-- ---------- 3. Backfill: create one client per distinct school name  ----------
--    from existing bookings, then point each booking at its client.

insert into public.clients (name, contact_person, phone, email)
select distinct on (school_name)
  school_name, contact_person, phone, email
from public.bookings
where school_name is not null and school_name <> ''
order by school_name, created_at desc;

alter table public.bookings disable trigger trg_enforce_booking_locks;

update public.bookings b
set client_id = c.id
from public.clients c
where b.school_name = c.name
  and b.client_id is null;

alter table public.bookings enable trigger trg_enforce_booking_locks;
