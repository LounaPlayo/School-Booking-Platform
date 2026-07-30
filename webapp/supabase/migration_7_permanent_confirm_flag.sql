-- ============================================================
-- Migration 7: Permanent confirmation flag (closes a real gap)
-- ============================================================
-- Run this once in Supabase's SQL Editor.
--
-- THE GAP: an Approver could set a booking to Confirmed, then revert
-- Booking Status back to Tentative (approvers can edit anything), and
-- since the delete rule only checked the CURRENT status, the booking
-- would become deletable again. That let anyone with approver access
-- undo the "confirmed bookings can never be deleted" guarantee simply
-- by un-confirming first.
--
-- THE FIX: a new ever_confirmed column that gets set to true the
-- FIRST time a booking reaches Confirmed or Completed, and can only
-- ever go false -> true, never back. Deletion and the agent-edit lock
-- are now both based on this permanent flag, not the current status -
-- so reverting the status for a correction no longer unlocks anything.
-- ============================================================

alter table public.bookings add column ever_confirmed boolean not null default false;

drop policy if exists "Confirmed bookings can never be deleted" on public.bookings;

create policy "Once-confirmed bookings can never be deleted"
  on public.bookings for delete
  using (not ever_confirmed);

create or replace function public.enforce_booking_locks()
returns trigger as $$
declare
  acting_role text;
  old_data jsonb;
  new_data jsonb;
  was_ever_confirmed boolean;
begin
  select role into acting_role from public.profiles where id = auth.uid();
  was_ever_confirmed := (TG_OP = 'UPDATE' and OLD.ever_confirmed);

  -- Set the permanent flag the moment a booking reaches Confirmed or
  -- Completed - regardless of who does it, what role they have, or
  -- whether this is the very first INSERT (e.g. a booking created
  -- already-Confirmed because the deposit amount auto-confirmed it
  -- client-side before the first save) or a later UPDATE.
  if new.booking_status in ('Confirmed', 'Completed') then
    new.ever_confirmed := true;
  end if;
  -- And it can never be unset once true, even by a direct attempt to
  -- write it back to false.
  if was_ever_confirmed then
    new.ever_confirmed := true;
  end if;

  if TG_OP = 'UPDATE' then
    if coalesce(acting_role, 'agent') <> 'approver' then
      if was_ever_confirmed then
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

drop trigger if exists trg_enforce_booking_locks on public.bookings;
create trigger trg_enforce_booking_locks
  before insert or update on public.bookings
  for each row execute function public.enforce_booking_locks();

-- Backfill AFTER the function above is in place: this runs only once,
-- for rows that don't have ever_confirmed set yet, so the new trigger's
-- lock logic (which only blocks when old.ever_confirmed is already
-- true) doesn't interfere with it.
update public.bookings set ever_confirmed = true
where booking_status in ('Confirmed', 'Completed') and not ever_confirmed;
