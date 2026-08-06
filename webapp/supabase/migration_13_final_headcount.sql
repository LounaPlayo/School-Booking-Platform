-- ============================================================
-- Migration 13: Final headcount tracking
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- Adds a column to record the ACTUAL number of kids who attended,
-- separate from number_of_students (the tentative/booked figure).
-- Confirmed at completion time, since attendance can differ from
-- what was originally booked - lets you compare booked vs actual
-- in reporting later.
-- ============================================================

alter table public.bookings add column final_number_of_kids numeric;
