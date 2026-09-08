# Frontend refinement — 9 September 2026

## Changes

- Added `src/components/ToolHelp.astro`: numbered instructions, native keyboard-accessible FAQ disclosures with first answer open, shared by all tool pages; original metadata and structured data preserved.
- Rebuilt `src/components/lottery/LotteryBanner.astro`: one surface, four labeled prize groups and hairline separators, two-column mobile layout, compact actions and source attribution; draw values and LiveDrawNotice unchanged.
- Updated `src/styles/global.css` / `product.css`: neutral black #0a0a0a canvas, #161616 surfaces, #202020 controls, #333333 borders; explicit and system dark modes match, ambient tint disabled in dark mode, neutral site footer.
- Updated ToolShell toolbar to “พื้นที่ทำงาน” so it does not claim a crashed or still-loading tool is ready.
- Updated `astro.config.mjs`: separate dependency caches by Astro command (dev/build/sync), prebundle qrcode, promptpay-qr and jsqr. No new dependencies.
- Updated DESIGN.md and UX-CONTRACT.md with the durable design/behavior decisions.

## Runtime failure and fix

Reproduced the supplied PromptPay failure on localhost:4321. SSR requested missing `node_modules/.vite/deps_ssr/qrcode.js`, browser qrcode/promptpay-qr imports returned 404, and React's lazy import entered ErrorBoundary. The Cloudflare adapter disables dependency discovery during build/sync (`isTypeGenPhase` in its installed source), while the old configuration shared the same Vite cache with the live development server. That invalidates modules held by the existing browser/worker.

The fix isolates caches with Astro's config setup command and includes the three CommonJS QR dependencies at startup. Vite documents [cacheDir](https://vite.dev/config/shared-options#cachedir) and [dependency prebundling](https://vite.dev/config/dep-optimization-options#optimizedeps-include). Restarted the dev server after the configuration change and generated a QR for test phone 0812345678 / amount 150. Then ran typecheck and build with the dev server still running and visited all 34 tool routes: HTTP 200, no page errors and no ErrorBoundary messages. No payment was sent.

## Verification

- ESLint, TypeScript and production build passed.
- Vitest: 68 files / 682 tests passed.
- SEO comparison against original repository build: all 115 route paths, titles, descriptions, canonicals, robots tags and JSON-LD unchanged; sitemap and robots.txt identical.
- Gzip budget passed: CSS 12.6 KB, tool JS p95 106 KB, tool HTML p95 12.2 KB, content JS p95 77.5 KB, content HTML p95 12.8 KB.
- Browser evidence lives in ignored `output/playwright/refinement-*` files.

- Browser QR flow passed: create PromptPay / download PNG / invalid target removes previous QR / read downloaded image back with QR reader / generate generic QR. No transfer or payment was performed.
- System dark, explicit light override, explicit dark and persisted preference after reload passed.
- Fixed a keyboard accessibility issue found during QA: both shared table renderers now expose named, focusable scroll regions; added a Tab-navigation regression test.

- Axe WCAG 2 A/AA + 2.1 AA checks passed on all 115 dark routes after fixing the table focus issue; screenshots reviewed as contact sheets.
- Responsive checks passed on home, income-tax and PromptPay pages at 1440 / 1024 / 768 / 390 / 320 px in both themes (30 combinations), including opening another FAQ with Enter; no page overflow.
- Strict premium static audit retained the same 15 reviewed false positives from the previous refactor (test fixtures, shared event-prop wrappers and generic/type/component matching); no new findings. See `premium-audit-reviewed.json` and `refinement-premium-audit.json` in the evidence directory.
