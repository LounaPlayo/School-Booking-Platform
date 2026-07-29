-- ============================================================
-- Migration 6: Split balance settlement
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- Replaces the single balance_settled_method column with three
-- amount columns, so a balance paid partly in Cash and partly via
-- Wish (or any combination) can be recorded properly.
-- ============================================================

alter table public.bookings drop column if exists balance_settled_method;
alter table public.bookings add column settled_cash numeric default 0;
alter table public.bookings add column settled_wish numeric default 0;
alter table public.bookings add column settled_bank numeric default 0;
