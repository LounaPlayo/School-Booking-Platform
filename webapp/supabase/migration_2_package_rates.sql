-- ============================================================
-- Migration 2: Editable Package Pricing
-- ============================================================
-- Run this in Supabase's SQL Editor (your project already has the
-- tables from schema.sql - this just adds a new one on top, so it's
-- safe to run once without affecting your existing bookings/profiles).
--
-- Creates a package_rates table: everyone signed in can read it (so
-- the booking form can auto-price), but only Approvers can add,
-- edit, or remove rates - managed from the new "Pricing" tab.
-- ============================================================

create table public.package_rates (
  id uuid primary key default gen_random_uuid(),
  package_name text not null unique,
  rate numeric not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- Explicit grants, so this works regardless of default privilege setup.
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

-- Seed with your current rates so nothing changes until you edit them.
insert into public.package_rates (package_name, rate) values
  ('Package A', 15),
  ('Package B', 12),
  ('Package C', 9);
