-- ============================================================
-- Migration 14: Extend settlement carve-out for new fields
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- The "Mark Completed" flow now also sets team_assigned,
-- final_number_of_kids, and a recalculated total_price (based on
-- final headcount vs. what was originally booked). Without this
-- update, Agents closing a booking would get silently blocked by
-- the lock trigger, since those three columns weren't on the
-- original allowlist from migration 8.
-- ============================================================

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
        old_data := to_jsonb(old) - 'updated_at' - 'updated_by' - 'booking_status'
                    - 'settled_cash' - 'settled_wish' - 'settled_bank'
                    - 'balance_settled_date' - 'approved_by'
                    - 'team_assigned' - 'final_number_of_kids' - 'total_price';
        new_data := to_jsonb(new) - 'updated_at' - 'updated_by' - 'booking_status'
                    - 'settled_cash' - 'settled_wish' - 'settled_bank'
                    - 'balance_settled_date' - 'approved_by'
                    - 'team_assigned' - 'final_number_of_kids' - 'total_price';
        if old_data is distinct from new_data then
          raise exception 'Only settlement details can be updated when closing a booking.';
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
