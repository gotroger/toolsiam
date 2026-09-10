# ToolSiam frontend behavior

Visual rules live in DESIGN.md. Scope: the September 2026 frontend refactor; no backend, API, auth or calculation policy changes.

## Evidence

- Current user brief authorizes tool-first discovery, responsive layout, frontend changes and SEO preservation.
- `src/tools/registry.ts` owns active/hidden/retired tools and editorial featured ranking.
- `src/tools/types.ts` and each `meta.ts` own tool descriptions, names, source rates, disclaimers and FAQs.
- `src/lib/routes.ts`, `src/lib/noindex.ts` and `src/lib/seo.ts` own URLs and indexing.
- `src/components/lottery/LiveDrawNotice.tsx` owns current-draw notices and remote recovery.
- `docs/superpowers/specs/2026-09-07-toolsiam-design.md` is historical product context; current implemented free tools and current brief govern this visual migration.

## Canonical UI Map

| Capability     | Canonical owner                                    | Source of truth                                        | Allowed variants                       | Verification                                          |
| -------------- | -------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------- |
| Form           | src/components/ui/form.tsx                         | Tool logic + existing field semantics                  | Field / NumberInput / Input / Textarea | Existing form/a11y tests + browser                    |
| Select/Listbox | src/components/ui/form.tsx Select                  | Existing native controls                               | native OS popup                        | Existing tests + browser open/select                  |
| Date           | src/components/ui/date-picker.tsx DatePicker       | User-requested Thai calendar + existing ISO date logic | authored modal calendar                | Component tests + browser keyboard / bounds / theme   |
| Scrollbar      | src/styles/product.css                             | DESIGN.md                                              | document and bounded search overlay    | computed styles + browser                             |
| Search         | src/components/ui/search-field.tsx, ToolSearch.tsx | Registry + routes                                      | command / catalog / SearchableList     | Search tests + browser                                |
| Navigation     | Header.astro, Breadcrumb.astro, CategoryPill.tsx   | routes.ts                                              | desktop / mobile                       | keyboard + resize                                     |
| File upload    | src/components/ui/file-drop.tsx                    | Per-tool accept/limit in files/catalog.ts              | FileDrop / SelectedFiles               | Component tests + browser drag, keyboard, both themes |
| Feedback       | ui/feedback.tsx, ErrorBoundary.tsx                 | Existing tool validation and clipboard helpers         | inline success / warning / error       | Existing tests                                        |

## Search and navigation

Home search offers up to six tool links plus matching category links; Enter navigates to the canonical catalog with a query. Tab reaches result links, ArrowDown reaches the first result, Escape dismisses the popup, leaving the search region closes it. This is a search form with ordinary links, not a combobox/listbox. Header click or Cmd/Ctrl+K focuses local discovery input; other pages navigate to the catalog. IME composition must never trigger submit or global shortcuts.

Catalog searches tool names, English names, keywords and category names. Category buttons expose aria-pressed; category links navigate to existing routes. URL q/category restore on load and history traversal; typing replaces the current query, category changes create history entries. Clear is immediate and returns focus. Home query is transient until submitted. No user calculation input is persisted by this work.

Static render includes the tool list and ordinary internal links for crawlers and no-JS navigation. Query/filter refinement requires the existing React island. No search HTTP requests exist, so remote races/offline retries are not applicable. Existing lottery requests retain their original behavior.

## Tools and content

Full original H1, title, description, canonical, JSON-LD, sources, FAQ and how-to content remain. Original description is below the workspace; a short discovery summary introduces it. Each tool retains its original calculation/validation behavior. Date fields use the shared authored DatePicker; ordinary select controls retain OS keyboard/popups. No authentication, billing, CRUD, delete or permission capability is introduced.

## Accessibility and recovery

Thai labels; native buttons and links; focus rings; skip link; reduced motion; light/dark/system theme; no hover-only actions. The theme switch updates its label and icon. Mobile menu closes on Escape and restores focus, closes when following a link and when crossing to desktop. Tool loading has a status message and reserved frame; existing ErrorBoundary handles loading/render failures. Existing numeric form errors preserve entered values.

## Migration ledger

Article-cover ToolCard → shared compact ToolCard, migrated across home/catalog/categories/related tools. Old hero → ToolSearch command. Category card grid → CategoryPill navigation. ToolShell → app workspace, all generated tool pages. Shared form/button/results and Base → global application styling, including lottery, horoscope and dream routes. Covers stay available for social/OG and existing content consumers. All changes are reversible through this frontend changeset.

## Help and lottery refinement

- Help preserves every instruction and FAQ answer from tool metadata; native disclosures work without JavaScript and permit multiple answers open.
- Dark theme and system dark share neutral black/gray surfaces; no navy page or card backgrounds.
- Lottery reward values and freshness behavior remain unchanged; actions follow the results on mobile.
- Dev, build and sync dependency caches are isolated so validation cannot invalidate modules used by an open dev server. Prebundle CommonJS QR dependencies before lazy tool routes load.

## Shared calendar — September 9

The user requested replacing every native date popup. DatePicker is the only date-selection owner across six tools and five horoscope pages. Display Thai months and Buddhist years with an explicit Gregorian year reference in the panel; emit YYYY-MM-DD Gregorian values and preserve every caller’s existing min/max constraints. Today is computed in Asia/Bangkok when opened.

Use a native modal dialog for top-layer placement, background inertness and focus containment. Match theme tokens; constrain placement within the viewport and use a bounded scroll area on short screens. Focus the selected day (or today clamped to the allowed range), restore the trigger on selection/cancel, and close on Escape/backdrop/close. Arrow keys move days/weeks, Home/End move to week edges, PageUp/PageDown move months, Shift+PageUp/PageDown move years; only one day participates in Tab order. Month/year controls navigate without changing the committed date. Clear emits an empty string. No calendar grids/options render until opened.

## Correctness audit — September 9

Tax forms share calculateTax and distinguish tax years 2025/2026, qualified deduction categories, and ordinary/double donations. Native Select and shared Field/Input/NumberInput remain the owners. Raw invalid numeric text must remain visible and suppress calculated results. Year conversion preserves invalid signs/text and reports its supported range.

Calendar differences count complete clamped calendar months from the original date and then remaining days; age uses the rollover variant to preserve its existing March 1 birthday convention for February 29 in non-leap years. Severance counts both employment endpoints and selects calendar-year bands; its 30-day monthly wage base may be enhanced to 26 only for additional employer benefits. Holiday calendars distinguish national and Bangkok scope. All calculations remain local.

### Readiness before calculator input

ToolIsland renders the existing loading state on the server and during initial hydration; calculator inputs appear only after React is ready and the lazy tool module resolves. This prevents visible values from changing before calculation handlers attach. ToolShell headings, instructions, FAQs and sources remain static HTML; no-JavaScript visitors see an explicit instruction.

## Local file conversion — September 9

The current user brief authorizes two new categories and lightweight document/image tools; docs/file-tools-roadmap.md records delivered scope and deferred work. `src/tools/files/shared/FileTool.tsx` owns file selection, ordered queues, removal, clear, busy/cancel, errors and downloads; shared Input/Field/Select/NumberInput/Button own controls. Office/PDF workers terminate on cancel, timeout and unmount. Completed object URLs are revoked on changes and unmount. Changing options invalidates old downloads; errors preserve valid files. No input files, extracted text or generated outputs are transmitted or persisted. Original local files are never modified. New conversions require a deliberate action; native picker provides keyboard access, and reordering always has buttons. Source tests and browser checks cover generated bytes, failures and recovery.

### Shared drag and drop — September 10

`src/components/ui/file-drop.tsx` is the only owner of file selection across the twelve document and image tools and the QR reader. Drag and drop is an addition, never the only path: the zone is a `<label>` wrapping a real `<input type="file">` hidden with `sr-only`, so Tab reaches it and Enter or Space opens the native picker. Clicking anywhere in the zone opens the picker through the label, without a click handler on a div.

The zone reports its drag state through `data-dragging` and counts dragenter/dragleave depth so crossing a child element does not drop the highlight. Dropping while disabled is ignored, as is a drop carrying no files. The input keeps its own accessible name via `aria-labelledby` and describes itself with the prompt, the hint and any external error id; type and size validation stays with each caller because limits and messages differ per tool.

Selected files list with a 48px tile: real thumbnails for images, an icon plus extension for everything else. Each thumbnail owns its object URL for the lifetime of its row and revokes it on unmount. Reordering stays on the up and down buttons so keyboard and screen reader users keep parity with pointer users.

### Shared choice and range controls — September 10

`SegmentedControl` owns option sets of two to four short labels; `Slider` owns every numeric range. Both live in `src/components/ui` and are the only owners of those patterns.

SegmentedControl renders real radio inputs hidden with `sr-only` inside a fieldset and legend, so the browser supplies the whole radio-group contract: arrow keys move the selection, the group is a single tab stop entered at the checked option, and assistive technology announces position within the set. No ARIA is hand-rolled. Options whose labels are long, such as rotation angles or CSV delimiters, stay on Select because three of them do not fit 375px.

The selected option is filled with the action color and white text, matching `.category-pill[aria-current]`. A raised white pill was tried first and rejected: dark theme inverts the ramp so surface (#161616) sits darker than a slate-100 track (#202020) at 1.11:1, which reads as a hole rather than a selection. The current pairing measures 5.24:1 light and 3.61:1 dark for fill against track, 5.48:1 for label on fill, and 7.25:1 / 11.96:1 for unselected labels.

Slider stays a native range input so arrows, Home, End and PageUp/PageDown work without added script. The filled portion is a percentage in `--slider-fill` consumed by `.product-slider`, because thumb and track pseudo-elements are unreachable from utility classes. The current value appears in a badge beside the label and in `aria-valuetext` with its unit, and the ratio is clamped so an out-of-range or unparseable value cannot paint past either end.

Select keeps native semantics and the OS popup. Its arrow is drawn as an overlaid SVG rather than a CSS `background-image` so it follows the theme, and `wrapperClassName` exists for controls that must not fill the row, since the arrow is positioned against the wrapper.
