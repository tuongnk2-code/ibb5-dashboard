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
The dashboard report is now an inline table with all 19 columns: customer and
contact details, owner, workflow status, both care notes and their timestamps,
outcome and its timestamp, callback, initial note, latest note, creation/update
times, and profile actions. All matching rows are rendered without a 50-row limit.
Filters and search apply to the table, which scrolls horizontally on both desktop
and mobile with sticky column headings and customer name. The CSV download button
was removed; existing CSV model helpers remain for compatibility.
Apply prospects.sql, prospect-care-report.sql, prospect-care-timestamps.sql in
order for a fresh setup. The transaction-only care SQL test always rolls back.
