# Lead visibility for personnel performance

Authenticated team leads with known roster membership receive a read-only `performanceStaff` projection on scoped monthly commitment rows. It contains only each approved integer goal and its approved status across the department. Outside-team plans, review/submission metadata, pending and rejected goals are not included in this projection.

Only the personnel performance table requests this projection when resolving goals. Monthly commitment screens continue using scoped `staff` data through `canViewCommitment`; writes and approvals retain existing ownership/manager checks. Staff and unknown-team leads receive no department-wide performance projection. Daily commitment permissions are unchanged. No database grant or policy changes are required.

Tests: commitment-save.test.js checks full/keyed API reads, sanitized fields and denied writes; performance-lead-metrics.browser.cjs checks cross-team goals, percentages, forecast/shortage columns and department totals while the monthly commitment screen remains team-scoped.
