-- ============================================================
-- Migration 4: Payment method, add-ons, and full-record locking
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- 1. Adds payment_method, add_on_food, add_on_fee columns.
-- 2. Replaces the lock trigger: previously only Booking Status and
--    Deposit Status were protected once locked. Now, once a booking
--    is Confirmed or Completed, NOTHING about it can be changed by
--    a non-approver - any field, any edit, requires an approver.
-- ============================================================

alter table public.bookings add column payment_method text;
alter table public.bookings add column add_on_food text default 'None';
alter table public.bookings add column add_on_fee numeric;

create or replace function public.enforce_booking_locks()
returns trigger as $$
declare
  acting_role text;
  old_data jsonb;
  new_data jsonb;
begin
  select role into acting_role from public.profiles where id = auth.uid();

  if coalesce(acting_role, 'agent') <> 'approver' then
    if old.booking_status in ('Confirmed', 'Completed') then
      -- Compare entire rows as JSON, ignoring the two metadata columns
      -- that legitimately change on every save regardless of content.
      old_data := to_jsonb(old) - 'updated_at' - 'updated_by';
      new_data := to_jsonb(new) - 'updated_at' - 'updated_by';
      if old_data is distinct from new_data then
        raise exception 'This booking is Confirmed. Only an approver can make changes to it.';
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;
