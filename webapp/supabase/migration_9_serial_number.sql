-- ============================================================
-- Migration 9: Booking serial numbers
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- Adds a stable, unique, auto-incrementing serial number to every
-- booking - unlike a row count in the UI, this number doesn't shift
-- around when you filter, sort, or search. Existing bookings get
-- numbered in the order they were created; every new booking gets
-- the next number automatically.
-- ============================================================

alter table public.bookings add column serial_number integer;

-- Temporarily disable the lock trigger for this backfill only - it's
-- an administrative data fix, not a user edit, and would otherwise get
-- blocked by the same rule that protects Confirmed bookings from
-- unauthorized changes.
alter table public.bookings disable trigger trg_enforce_booking_locks;

with numbered as (
  select id, row_number() over (order by created_at) as rn
  from public.bookings
)
update public.bookings b
set serial_number = n.rn
from numbered n
where b.id = n.id;

alter table public.bookings enable trigger trg_enforce_booking_locks;

-- Set up a sequence so every new booking gets the next number
-- automatically, continuing on from the highest existing number.
create sequence if not exists public.bookings_serial_seq;
select setval('public.bookings_serial_seq', greatest(coalesce((select max(serial_number) from public.bookings), 0), 1));
grant usage, select on sequence public.bookings_serial_seq to authenticated;
alter table public.bookings alter column serial_number set default nextval('public.bookings_serial_seq');
alter table public.bookings alter column serial_number set not null;
alter table public.bookings add constraint bookings_serial_number_unique unique (serial_number);
