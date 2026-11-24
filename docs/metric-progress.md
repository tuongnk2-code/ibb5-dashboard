# Dashboard metric progress

Percentage and completion indicators share `metricProgressModel.js` and `metricProgress.css`. `metricProgress.js` enhances explicitly selected display nodes after rendering and refreshes on data changes. Editable inputs, prices, tax rates and narrative text are excluded.

Coverage: overview monthly/daily goals, forecast, growth and quality ratios; personnel completion/forecast cells and totals; cancellation rates; channel/staff contribution; market conversion rates; daily report completion and submission coverage; weekly growth and report rollups; customer-care campaign result coverage. Daily commitment cells retain their existing compact progress bars.

Completion fills increase from red through amber to green. Distribution ratios use blue without implying performance quality. Cancellation rates use increasing warning intensity. Signed growth uses a centered zero line and retains its sign. Values above 100% remain visible while the fill is capped. Unknown ratios remain unknown; no denominator is invented. Underlying business calculations, permissions, save flows and CSV data are unchanged.

Validation: `node tests/metric-progress.test.cjs`, `tests/metric-progress.browser.cjs` on 1440px and 390px, plus affected report, personnel, care and daily-commitment browser regressions. Production build uses `npm run build`.
