# Nhân sự số IBB5

The controller is integrated with the existing Vite/Vercel application and Supabase.
It does not purchase infrastructure or assume a Zalo/Facebook adapter exists.

## Data and permissions

Apply `supabase/digital-worker.sql` once using a migration. Tables and RPCs are
service-role only; browser requests must pass authenticated `/api/digital-worker`.
Managers see/control all staff, leads view their team, staff view/control themselves.
Device credentials are random 256-bit tokens; only SHA-256 hashes are stored.
The plaintext is returned once, immediately after enrolling a device. Never commit
downloaded `*.local.json` or their journals.

## Execution

The device polls over outbound HTTPS, so no inbound remote desktop port is opened.
Each device belongs to one owner. Its locally configured handler allowlist announces
capabilities. Dashboard text is data passed on stdin to fixed local commands, never
shell commands. Real tool integration must be separately implemented and tested.

Manual runs require a preview/confirmation and UUID request key. Tasks are created
paused. Enabling a schedule approves its saved content for repeated execution.
Changes pause the schedule again. A run stores an immutable task snapshot.
Queued/running work is not silently replaced by edits to a task.

`claim_worker_run` serializes by device using row locks and skips duplicate due
occurrences. There is at most one running item per device. Missed repeat intervals
are coalesced, not replayed as a burst when a PC comes online. No cloud scheduler is
needed: the device poll creates due runs. No task executes while its PC is offline.

Pause affects future scheduling, not work already queued. Cancel requests are
acknowledged by the runner; no assertion is made that external messages are undone.
An orphaned running item is failed with a review warning, never automatically retried.
Adapters must implement their tool's own deduplication and confirm real outcomes.

## Local connector

Download `/digital-worker/ibb5-worker.zip`, enroll a device, download its private
configuration, and follow README.txt. Requires Node 20+. Configure a Windows login
scheduled task for UI-based tools. Do not run UI adapters in an unattended service
session. Do not put service-role keys or social account passwords in the connector.

## Scope limits

This release provides task creation/editing, typed/optional voice commands for existing tasks,
confirmed manual runs, daily/weekly schedules, device enrollment/revocation,
queue/claim/cancel/acknowledgement, and scoped recent results. It does not include
Facebook scraping, Zalo sending, automatic ad spend, or a generic AI remote desktop.
Without a locally configured adapter the relevant channel remains unavailable.
No complete status is inferred merely from enqueueing a task.

## Named channels requested by the user

The controller distinguishes Meta Facebook (`meta_facebook`), Top Zalo (`top_zalo`),
Chốt Care (`chot_care`), SMS AkaBiz (`sms_akabiz`), FBnumber (`fbnumber`), and
FB AkaBiz (`fb_akabiz`), and FPT SOP (`fpt_sop`). These names are dispatch keys, not proof that a tool is
connected. Each must have a locally configured handler before it can execute.
Chốt Care is at https://care.chotnhanh.vn/; its authenticated workflow and the
installed versions of the remaining tools must be inspected before adapters are
implemented. No account passwords, cookies, or customer chat identifiers are
shipped in this project.

FPT SOP entry point: https://portal-sop.fpt.vn/trang-chu. The channel remains
unavailable until its authorized local adapter is configured; registration does
not imply login access or that SOP actions are already automated.
