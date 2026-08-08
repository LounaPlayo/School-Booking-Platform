-- ============================================================
-- Cleanup: Clear test data, reset serial numbers to start at 1
-- ============================================================
-- Run this once in Supabase's SQL Editor when you're ready to go
-- live for real. This wipes:
--   - All bookings
--   - All clients
-- And resets the booking # counter so your first real booking
-- becomes #1.
--
-- NOT touched: Team accounts (profiles), Package Pricing.
-- ============================================================

-- Bookings first (they reference clients, so this must go first
-- to avoid a foreign key error on the next step).
delete from public.bookings;

-- Now clients, safe to remove since no bookings reference them anymore.
delete from public.clients;

-- Reset the serial number counter so the next booking created
-- starts fresh at #1.
alter sequence public.bookings_serial_seq restart with 1;
