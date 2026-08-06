-- ============================================================
-- Migration 11: Rename "Wish" to "Whish"
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- Updates any existing bookings that have payment_method = 'Wish'
-- (from the deposit) to 'Whish', matching the corrected spelling used
-- throughout the app now.
-- ============================================================

alter table public.bookings disable trigger trg_enforce_booking_locks;

update public.bookings
set payment_method = 'Whish'
where payment_method = 'Wish';

alter table public.bookings enable trigger trg_enforce_booking_locks;
