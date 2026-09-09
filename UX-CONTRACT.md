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

| Capability     | Canonical owner                                    | Source of truth                                        | Allowed variants                       | Verification                                        |
| -------------- | -------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- | --------------------------------------------------- |
| Form           | src/components/ui/form.tsx                         | Tool logic + existing field semantics                  | Field / NumberInput / Input / Textarea | Existing form/a11y tests + browser                  |
| Select/Listbox | src/components/ui/form.tsx Select                  | Existing native controls                               | native OS popup                        | Existing tests + browser open/select                |
| Date           | src/components/ui/date-picker.tsx DatePicker       | User-requested Thai calendar + existing ISO date logic | authored modal calendar                | Component tests + browser keyboard / bounds / theme |
| Scrollbar      | src/styles/product.css                             | DESIGN.md                                              | document and bounded search overlay    | computed styles + browser                           |
| Search         | src/components/ui/search-field.tsx, ToolSearch.tsx | Registry + routes                                      | command / catalog / SearchableList     | Search tests + browser                              |
| Navigation     | Header.astro, Breadcrumb.astro, CategoryPill.tsx   | routes.ts                                              | desktop / mobile                       | keyboard + resize                                   |
| Feedback       | ui/feedback.tsx, ErrorBoundary.tsx                 | Existing tool validation and clipboard helpers         | inline success / warning / error       | Existing tests                                      |

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
