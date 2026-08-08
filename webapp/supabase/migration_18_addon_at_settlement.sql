-- ============================================================
-- Migration 18: Add-On confirmable at final settlement
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- The "Mark Completed" flow now also lets the team confirm/adjust
-- Add-On Food and Add-On Fee at settlement time (final headcount
-- can change what add-ons are actually needed, so this shouldn't be
-- locked in from the very first booking). Without this update,
-- Agents closing a booking would get silently blocked the same way
-- team_assigned and final_number_of_kids were before migration 14.
-- ============================================================

create or replace function public.enforce_booking_locks()
returns trigger as $$
declare
  acting_role text;
  old_data jsonb;
  new_data jsonb;
  is_settlement_close boolean;
  is_late_deposit_edit boolean;
begin
  select role into acting_role from public.profiles where id = auth.uid();

  is_settlement_close := (
    TG_OP = 'UPDATE'
    and OLD.booking_status = 'Confirmed'
    and NEW.booking_status = 'Completed'
  );

  is_late_deposit_edit := (
    TG_OP = 'UPDATE'
    and OLD.booking_status in ('Confirmed', 'Completed')
    and OLD.deposit_status is distinct from 'Received'
  );

  if TG_OP = 'UPDATE' then
    if coalesce(acting_role, 'agent') <> 'approver' then

      if is_settlement_close then
        old_data := to_jsonb(old) - 'updated_at' - 'updated_by' - 'booking_status'
                    - 'settled_cash' - 'settled_wish' - 'settled_bank'
                    - 'balance_settled_date' - 'approved_by'
                    - 'team_assigned' - 'final_number_of_kids' - 'total_price'
                    - 'add_on_food' - 'add_on_fee';
        new_data := to_jsonb(new) - 'updated_at' - 'updated_by' - 'booking_status'
                    - 'settled_cash' - 'settled_wish' - 'settled_bank'
                    - 'balance_settled_date' - 'approved_by'
                    - 'team_assigned' - 'final_number_of_kids' - 'total_price'
                    - 'add_on_food' - 'add_on_fee';
        if old_data is distinct from new_data then
          raise exception 'Only settlement details can be updated when closing a booking.';
        end if;

      elsif is_late_deposit_edit then
        old_data := to_jsonb(old) - 'updated_at' - 'updated_by'
                    - 'deposit_status' - 'deposit_amount_received' - 'deposit_date' - 'payment_method';
        new_data := to_jsonb(new) - 'updated_at' - 'updated_by'
                    - 'deposit_status' - 'deposit_amount_received' - 'deposit_date' - 'payment_method';
        if old_data is distinct from new_data then
          raise exception 'Only deposit details can be updated on a Confirmed booking until the deposit is marked Received.';
        end if;

      elsif OLD.booking_status in ('Confirmed', 'Completed') then
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
