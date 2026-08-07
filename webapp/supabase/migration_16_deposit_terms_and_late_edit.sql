-- ============================================================
-- Migration 16: Deposit terminology + late-deposit editing
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- PART 1: Renames deposit status values for clearer terminology:
--   "Not Requested" -> "Not Required"
--   "Requested"      -> "Required"
--   (Partial and Received stay the same)
--
-- PART 2: Lets Agents fill in a deposit that comes in LATE, even
-- after a booking is already Confirmed - e.g. an event confirmed
-- with no deposit needed, but the school pays one anyway a week
-- later. Deposit fields stay editable for Agents as long as the
-- deposit hasn't ALREADY been marked Received - the moment it is,
-- they lock again exactly like everything else on a Confirmed
-- booking, requiring an Approver for any further change.
-- ============================================================

-- ---------- Part 1: rename values ----------

alter table public.bookings disable trigger trg_enforce_booking_locks;

update public.bookings set deposit_status = 'Not Required' where deposit_status = 'Not Requested';
update public.bookings set deposit_status = 'Required' where deposit_status = 'Requested';

alter table public.bookings enable trigger trg_enforce_booking_locks;

alter table public.bookings alter column deposit_status set default 'Not Required';

alter table public.bookings drop constraint if exists bookings_deposit_status_check;
alter table public.bookings add constraint bookings_deposit_status_check
  check (deposit_status in ('Not Required', 'Required', 'Partial', 'Received'));

-- ---------- Part 2: late-deposit editing carve-out ----------

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
                    - 'team_assigned' - 'final_number_of_kids' - 'total_price';
        new_data := to_jsonb(new) - 'updated_at' - 'updated_by' - 'booking_status'
                    - 'settled_cash' - 'settled_wish' - 'settled_bank'
                    - 'balance_settled_date' - 'approved_by'
                    - 'team_assigned' - 'final_number_of_kids' - 'total_price';
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
