# Viewed notification history

The inbox has Unread and Viewed views. Viewed lazily fetches `/api/report-comments?inbox=mine&view=read`, independently from unread polling/badge counts. Report notifications are selected by authenticated recipient and non-null read_at, newest first (100 maximum), then checked against current report visibility. Users can reopen the report thread from history.

Contract history uses the existing recipient-owned contract_alert_reads receipts. It shows the latest receipt per contract (maximum 100), including resolved alerts while that NET contract still exists in the current source and remains within the caller's current scope. Contract IDs/staff/customer are taken from current scoped data; viewed_at and warning kinds come from the receipt. Deleted or no-longer-visible contracts are omitted. No new tables or policies are required. History does not create unread counts or phone badges.

Validation: report-comments.test.js and contract-alert-reads.test.js exercise authenticated reads, recipient isolation and current scope. report-comments.browser.cjs and mobile-notification-sync.browser.cjs check history reopening, escaped content, tab switching and unchanged badge counts.
