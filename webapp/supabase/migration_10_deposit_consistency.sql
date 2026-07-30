-- ============================================================
-- Migration 10: Deposit consistency rules
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- Two data-integrity rules, enforced as hard constraints (these apply
-- to EVERYONE, including approvers - they're not permission rules,
-- they're "this combination of data never makes sense" rules):
--
--   1. If a deposit is marked Received (or has an amount > 0), the
--      booking's status MUST be Confirmed or Completed. It can never
--      be saved as Tentative, Deposit Pending, Not Interested, or
--      Cancelled while showing a deposit has come in.
--
--   2. If a deposit has an amount > 0, a Payment Method must be
--      selected - otherwise that money is invisible in the Cash /
--      Wish / Bank breakdown shown throughout the app.
-- ============================================================

alter table public.bookings add constraint deposit_received_implies_confirmed
  check (
    not (
      (deposit_status = 'Received' or coalesce(deposit_amount_received, 0) > 0)
      and booking_status not in ('Confirmed', 'Completed')
    )
  );

alter table public.bookings add constraint deposit_requires_payment_method
  check (
    not (
      coalesce(deposit_amount_received, 0) > 0
      and (payment_method is null or payment_method = '')
    )
  );
