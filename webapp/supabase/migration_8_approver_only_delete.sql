-- ============================================================
-- Migration 8: Approver-only delete, agent settlement carve-out
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- CHANGES FROM BEFORE:
--   1. Agents can no longer delete ANY booking, at any status -
--      not even Tentative. Only Approvers can delete, period.
--   2. Agents can still create and edit bookings freely while
--      working a lead (Tentative / Deposit Pending) - unchanged.
--   3. NEW CARVE-OUT: Agents can still perform the one specific
--      action of closing a Confirmed booking's final settlement
--      (Confirmed -> Completed, with the Cash/Wish/Bank amounts
--      and settlement date) - even though the record is otherwise
--      locked once Confirmed. Only that exact transition, touching
--      only those specific columns, is allowed through for Agents.
--      Any other edit to a Confirmed/Completed booking still
--      requires an Approver, and correcting an ALREADY-completed
--      settlement also requires an Approver.
-- ============================================================

-- 1. Tighten delete: approver-only, regardless of status.
drop policy if exists "Confirmed bookings can never be deleted" on public.bookings;
drop policy if exists "Sealed bookings can never be deleted" on public.bookings;
drop policy if exists "Once-confirmed bookings can never be deleted" on public.bookings;

create policy "Only approvers can delete bookings"
  on public.bookings for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'approver')
  );

-- 2. Add the settlement-closing carve-out to the lock trigger.
create or replace function public.enforce_booking_locks()
returns trigger as $$
declare
  acting_role text;
  old_data jsonb;
  new_data jsonb;
  is_settlement_close boolean;
begin
  select role into acting_role from public.profiles where id = auth.uid();

  is_settlement_close := (
    TG_OP = 'UPDATE'
    and OLD.booking_status = 'Confirmed'
    and NEW.booking_status = 'Completed'
  );

  if TG_OP = 'UPDATE' then
    if coalesce(acting_role, 'agent') <> 'approver' then

      if is_settlement_close then
        -- Allowed for agents, but ONLY these columns may differ.
        old_data := to_jsonb(old) - 'updated_at' - 'updated_by' - 'booking_status'
                    - 'settled_cash' - 'settled_wish' - 'settled_bank'
                    - 'balance_settled_date' - 'approved_by';
        new_data := to_jsonb(new) - 'updated_at' - 'updated_by' - 'booking_status'
                    - 'settled_cash' - 'settled_wish' - 'settled_bank'
                    - 'balance_settled_date' - 'approved_by';
        if old_data is distinct from new_data then
          raise exception 'Only settlement details can be updated when closing a booking.';
        end if;

      elsif OLD.booking_status in ('Confirmed', 'Completed') then
        -- Full lock: any other edit to a Confirmed/Completed booking
        -- (including correcting an already-closed settlement) needs
        -- an Approver.
        old_data := to_jsonb(old) - 'updated_at' - 'updated_by';
        new_data := to_jsonb(new) - 'updated_at' - 'updated_by';
        if old_data is distinct from new_data then
          raise exception 'This booking is Confirmed. Only an approver can make changes to it.';
        end if;
      end if;

    end if;
    new.updated_at := now();
  end if;

  return new;
end;
$$ language plpgsql security definer;
