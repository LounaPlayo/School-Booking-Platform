-- ============================================================
-- Migration 5: Balance settlement on completion
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- Adds two columns so completing a booking records how the
-- remaining balance was actually paid.
-- ============================================================

alter table public.bookings add column balance_settled_method text
  check (balance_settled_method in ('Cash', 'Wish', 'Bank'));
alter table public.bookings add column balance_settled_date date;
