-- ============================================================
-- Migration 3: Broaden the delete-protection rule
-- ============================================================
-- Previously, a booking could only be deleted-proof once it was BOTH
-- Confirmed/Completed AND had its deposit marked Received. This
-- changes the rule to be simpler and stricter: ANY booking that is
-- Confirmed or Completed can never be deleted, regardless of deposit
-- status.
--
-- Run this once in Supabase's SQL Editor.
-- ============================================================

drop policy if exists "Sealed bookings can never be deleted" on public.bookings;

create policy "Confirmed bookings can never be deleted"
  on public.bookings for delete
  using (
    not (booking_status in ('Confirmed', 'Completed'))
  );
