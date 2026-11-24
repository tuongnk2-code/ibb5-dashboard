# Table zoom controls

`installTableZoom` enhances dashboard tables and dynamically created detail tables with independent A− / percentage-reset / A+ controls. Range is 60–140% in 10% steps; the percentage button restores 100%. Preferences are stored per table in device localStorage. Existing personnel-performance font controls are retained without duplication. Floating sticky-header copies are excluded.

The controls scale table presentation only; values, filters, scope and writes are unchanged. Controls are marked `data-capture-ui` and omitted from print/capture UI. Observing child changes restores controls/preferences when a table is replaced and removes orphaned controls. Native button semantics support keyboard use; disabled endpoints prevent out-of-range changes.

Validation: table-zoom.browser.cjs covers independent levels, reload persistence, dynamic tables/replacements, limits, reset, capture exclusion and desktop/mobile. Existing daily-commitment and personnel-filter browser checks cover layout/filter regressions.
Placement prefers each table's own heading/tools row. The daily sales matrix puts zoom beside its title, above the filter row; schedule zoom sits between the capture button and tracked-date selector. Standalone headings are arranged as compact flex rows. Tables without a heading retain a small control immediately above them. Existing per-table persistence keys are unchanged.
