# Private KHTN inbox

The private `#prospects` tab is limited to three explicitly enrolled profile IDs:
the single existing Trưởng phòng plus DNG.DatHX4 and DNG.HoaNTB6. Membership is
stored in `prospect_members`, not inferred from an editable client role or shared
with every manager. The one-time migration resolves existing profiles and aborts
unless it finds exactly the intended three users.

`GET /api/prospects?access=1` returns only an allowed boolean. Navigation is hidden
in the initial HTML with an important display rule and remains hidden until the
authenticated server confirms membership. Direct hash navigation and API requests
do not grant access. All tables/RPCs are service-role only, with RLS enabled; each
request checks current membership. Revocation/authentication failures clear loaded
private UI data. No leads are stored in localStorage or the shared dashboard JSON.

All three authorized users see the shared inbox and history. The manager assigns
or reassigns to the two handlers and edits original contact details. Handlers can
claim an unassigned prospect or update a prospect currently assigned to themselves.
They cannot reassign or modify another person's work. Newly added handler leads
are assigned to that handler. Manager additions can stay in the shared waiting pool.

The current intake is manual, one customer at a time, as requested. Vietnam phone
numbers are normalized and globally unique within the inbox. Duplicate customer
creation never overwrites the original contact. Status, callback time and notes
are updated atomically with immutable history using row locks and revisions. A
stale edit is rejected while preserving its input for explicit review. Closed
statuses clear callback reminders. No external messages or bulk exports are sent.

Verification: `tests/prospects.test.cjs`, `tests/prospects.browser.cjs`, and the
transaction-only `tests/prospects.rollback.sql`. The SQL test inserts synthetic
records and rolls back, exercising exclusive receipt, current owner checks,
manager reassignment, and atomic history. Never remove the rollback transaction.

Care/report additions: Source is removed from intake and visible contact details;
existing source values are preserved when editing older records. The process
subtitle and private-account badge are hidden without changing authorization.
Care 1, Care 2 and the five business outcomes are editable by the current handler
or manager and recorded in atomic history. Each changed care/result field gets a
server timestamp; unrelated saves preserve that field's previous timestamp.
Existing records have no invented historical care dates.
The report follows the requested column order: entry time, assigned employee,
customer phone, address, original need, outcome, Care 1, Care 2 and callback.
A final row action contains Save information. Name appears below the phone.
Each care timestamp appears below its textarea, without separate timestamp
columns. Entry time is the immutable server-created created_at value set when
the new customer is saved; care/result edits never reset it. No profile button
or CSV download is shown. All matching rows remain visible, with horizontal
scrolling and a sticky phone column for compact screens.
Apply prospects.sql, prospect-care-report.sql, prospect-care-timestamps.sql in
order for a fresh setup. The transaction-only care SQL test always rolls back.

Inline editing is explicit-save: input and change events only update a local
draft. Save information writes that row's care notes, outcome and callback in
one revision-checked update with atomic history. Managers can change assignment
using the row selector and the same Save button. Assignment is saved first if
changed; a subsequent care failure reports partial completion and retains the
remaining draft. Staff can edit their own assigned rows and claim waiting rows.
Dates/notes are not written until Save is clicked. Unsaved drafts survive table
search/redraw; background refresh skips drafts. Stale writes show an error and
never silently overwrite a newer revision. Existing history stays on the server.
