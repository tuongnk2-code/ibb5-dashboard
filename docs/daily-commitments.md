# Cam Kết Ngày

The tab is visible only after the authenticated API confirms manager/lead access.
Managers see all roster accounts; team leads see only their roster team. Staff,
unknown-team leads and unauthenticated requests cannot read targets through the
API. Initial HTML hides the menu link, including on mobile; direct hash access
also displays denial. Only managers may write. The new table is RLS-enabled with
no direct anon/authenticated grants; the server service client checks roles.

Each row is keyed by Vietnam calendar date and canonical roster Acc. Two explicit
nonnegative integer targets are saved together using a row revision (insert for
revision zero, conditional update otherwise). Conflicts retain the local draft;
Discard reloads current saved values. Blank/unentered targets stay unknown, and
zero is an explicit valid target. Saves record the authenticated updater and time.
Daily targets are independent from monthly commitments and daily report promises.

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
Tests: daily-commitments.test.cjs and daily-commitments.browser.cjs cover API roles,
team scoping, duplicate/cancelled NET, date isolation, conflicts, zero/blank targets,
NET refresh, Acc-only identity, and 320/390/1440px layouts.
