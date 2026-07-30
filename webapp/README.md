# School Events Booking Platform

A real, standalone booking tool for Playo and Oh Chateau school events —
dashboard, bookings list/form, team roles, and a rule enforced by the
database itself: a booking that's Confirmed (or Completed) AND has its
deposit marked Received can never be deleted, by anyone, including
Approvers.

## What's in this folder

- `app/` — the actual application pages (Next.js)
- `components/` — shared UI pieces (the booking form, sidebar, etc.)
- `lib/` — Supabase connection + shared constants
- `supabase/schema.sql` — the database setup script (run this first)
- `.env.local.example` — shows the two settings you'll need to fill in

## Deployment (no coding required)

This gets deployed via three free accounts working together:
**Supabase** (database + login), **GitHub** (holds the code),
**Vercel** (hosts the live site). Full step-by-step instructions are
in the chat where this was built — go through them one at a time
rather than all at once.

Rough order:
1. Create a Supabase project, run `supabase/schema.sql` in its SQL Editor
2. Copy this whole folder into a new GitHub repository (via GitHub's
   web upload — no git commands needed)
3. Import that repository into Vercel
4. In Vercel's project settings, add the two environment variables
   from `.env.local.example`, using the real values from your
   Supabase project's Settings > API page
5. Deploy

## How the roles work

- The **first person** to create an account becomes an **Approver**
- Everyone after that starts as an **Agent**
- Approvers can promote/demote anyone from the Team page
- Agents can freely manage bookings until Booking Status is
  Confirmed/Completed or Deposit Status is Received — after that,
  only an Approver can change those specific fields
- Nobody — not even an Approver — can delete a booking that is both
  Confirmed/Completed AND has its deposit Received. This is enforced
  as a database policy, not just in the app.
