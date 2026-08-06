-- ============================================================
-- Migration 12: Completed requires full settlement, always
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- Closes the gap where someone could select "Completed" directly
-- from the Booking Status dropdown, skipping the settlement modal
-- entirely - which is exactly what happened with the "CCJ" booking
-- (Completed, but zero Cash/Wish/Bank recorded).
--
-- This makes it a hard database rule: a booking can only be Completed
-- if what's recorded as settled (Cash + Wish + Bank) covers the full
-- amount owed after the deposit (Total Price + Add-On Fee - Deposit).
-- Applies to everyone, including approvers doing a direct edit.
-- ============================================================

alter table public.bookings add constraint completed_requires_full_settlement
  check (
    booking_status <> 'Completed'
    or (
      coalesce(settled_cash, 0) + coalesce(settled_wish, 0) + coalesce(settled_bank, 0)
      >= (coalesce(total_price, 0) + coalesce(add_on_fee, 0) - coalesce(deposit_amount_received, 0))
    )
  );
