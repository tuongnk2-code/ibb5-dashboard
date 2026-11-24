# Cam Kết Ngày

The table is embedded above the daily-report form in the Báo cáo ngày tab,
visible only after the authenticated API confirms manager/lead access.
Managers see all roster accounts; team leads see only their roster team. Staff,
unknown-team leads and unauthenticated requests cannot read targets through the
API. Initial HTML hides this embedded table. There is no separate menu item; the old
#dailyCommitments link redirects to #dailyReports. Staff still use their report
form normally without seeing the manager/lead commitment table. Only managers may write. The new table is RLS-enabled with
no direct anon/authenticated grants; the server service client checks roles.

Each row is keyed by Vietnam calendar date and canonical roster Acc. Two explicit
nonnegative integer targets are saved together using a row revision (insert for
revision zero, conditional update otherwise). Conflicts retain the local draft;
Discard reloads current saved values. Blank/unentered targets stay unknown, and
zero is an explicit valid target. Saves record the authenticated updater and time.
Daily targets default to the employee's submitted report from the previous
calendar date: tomorrowPttb feeds Bán mới and tomorrowOnline feeds Online. Draft
and exempt reports do not qualify. Missing/invalid commitments stay unknown.
A manager row in daily_commitments overrides this report-derived baseline,
including an explicit zero. Subsequent report edits refresh the baseline only
for accounts without a manager override. The report itself is never modified by
a manager adjustment. Monthly commitments remain independent.

NET actuals use the latest shared dashboard snapshot. When no snapshot exists,
the API paginates contracts as fallback. Bán mới counts unique Internet contract
IDs created on the selected day whose latest NET status is Bình thường. Online
counts unique Internet IDs with Online date equal to the selected day. August
payroll-only records follow the existing dashboard exclusion. Counts normalize
account case, filter to the visible roster, and never return raw contracts. Empty
NET data is represented as unknown rather than zero. Deficits are max(target -
actual, 0); team totals add each person's shortfall. Unknown goals display —.

The UI shows Acc only, grouped under Bầy with subtotal and total rows. Grouped
headers match Cam kết / Thực hiện / Thiếu, each split Bán mới / Online. Targets
are editable only for managers; actuals and deficits are read-only. Date selection
uses Vietnam's current day by default. Quiet refresh skips drafts and saving.
In-flight reads are invalidated before saving to prevent stale refresh overwrites.
The existing daily-report-updated event refreshes this table when safe; a quiet
refresh also runs while Báo cáo ngày is active. The embedded table keeps its own
Ngày theo dõi picker, allowing tomorrow's targets alongside today's report.
Tests: daily-commitments.test.cjs and daily-commitments.browser.cjs cover API roles,
team scoping, duplicate/cancelled NET, date isolation, conflicts, zero/blank targets,
NET refresh, Acc-only identity, and 320/390/1440px layouts.

Desktop overview fitting: from 900px width, the table calculates a compact row
height from the available viewport space, roster/totals row count and header
height. It recalculates after renders, status messages and window/root resizing.
The inner vertical scroll cap is removed. Tests assert the footer fits inside
1366x768 and 1280x720 screens and the table has no vertical overflow. Narrow
phone screens retain larger editable controls and horizontal scrolling.
