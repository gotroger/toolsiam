# Shared Thai calendar — 9 September 2026

Replaced all 18 native date fields across 11 pages (six tools and five horoscope pages) with `src/components/ui/date-picker.tsx`.

## Behavior

- Thai month names and Buddhist years in the trigger/calendar, with a Gregorian year reference in the panel; callbacks continue to emit Gregorian ISO YYYY-MM-DD strings.
- Direct month/year selection, previous/next month, today in Asia/Bangkok, and clear.
- Existing min/max date constraints preserved, including the 2026-only holidays tool and the Chinese-zodiac supported range.
- Native modal dialog provides top-layer rendering over clipped workspaces and background inertness; explicit Tab/Shift+Tab wrapping, Escape/backdrop cancellation and focus restoration.
- Arrow keys navigate days/weeks, Home/End navigate week boundaries, PageUp/PageDown navigate months, Shift+PageUp/PageDown navigate years; date selection uses Enter/Space.
- Selecting a month/year only navigates; choosing a day commits immediately and recalculates the tool.
- Black/gray dark surfaces and existing green action colors; viewport-bounded panel with internal scrolling on short screens.
- Calendar contents render only while open. Import this primitive from its own module so unrelated tools do not load calendar code. No dependencies added.

Keyboard behavior follows the [W3C date-picker dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/). Month arithmetic reuses the existing shared date logic, including leap-day clamping; no calculation or API contract was changed.

## Migration

Tools: work-tenure, age-days, severance-pay, date-add, thai-holidays, thai-year-convert.

Horoscope components: BirthdayProfile, ZodiacFinder, ChineseZodiacFinder, LuckyColorFinder, NumerologyFinder.

Canonical ownership and design decisions are maintained in DESIGN.md, UX-CONTRACT.md and premium-ui.json.

## Verification

- Eight component tests cover date selection, leap days, month/year navigation, range constraints, cancellation, clear, one tabbable day and focus wrapping; native dialog methods are stubbed only in jsdom, with real modal behavior checked in Chromium.
- Real browser checks across 11 routes × two themes × two widths (1440/390): 44 states, no JavaScript errors or axe WCAG 2 A/AA and 2.1 AA violations.
- Additional interaction checks at 320×568, 768×600 and 844×390: popup stays within the viewport; keyboard navigation, Tab containment, Escape/backdrop, today/clear and recalculation passed.
- Evidence: ignored output/playwright/calendar-* scripts, logs and screenshots.
- Final full suite: 69 files / 690 tests passed; ESLint, typecheck and production build passed.
- Existing performance budget passed (CSS 13 KB; tool JS p95 106 KB, maximum 121.1 KB).
- All 115 routes, SEO metadata, JSON-LD, sitemap and robots.txt match the original baseline.
- Premium static audit adds no findings; the same 15 reviewed false positives from the earlier refactor remain. DESIGN.md lint has zero errors.
