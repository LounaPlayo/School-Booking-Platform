-- ============================================================
-- Migration 15: Retire "Deposit Pending" status
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- Merges "Deposit Pending" into "Tentative" - both represented the
-- same thing in practice (a lead that needs follow-up, not yet
-- confirmed), and keeping them separate wasn't adding real value.
-- ============================================================

-- 1. Move any existing bookings off the retiring status first.
update public.bookings
set booking_status = 'Tentative'
where booking_status = 'Deposit Pending';

-- 2. Tighten the constraint so it can't be selected again. Postgres
--    auto-names an unnamed column CHECK as {table}_{column}_check.
alter table public.bookings drop constraint if exists bookings_booking_status_check;

alter table public.bookings add constraint bookings_booking_status_check
  check (booking_status in ('Tentative', 'Confirmed', 'Completed', 'Not Interested', 'Cancelled'));
