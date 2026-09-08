---
version: alpha
name: ToolSiam
description: เครื่องมือออนไลน์ภาษาไทยที่เปิดใช้ได้ทันที
colors:
  primary: '#047857'
  primary-hover: '#065f46'
  mint: '#10b981'
  blue: '#5286d9'
  orange: '#d58a40'
  lime: '#75a444'
  violet: '#8d79cf'
  rose: '#cf7894'
  teal: '#379e9c'
  gold: '#c9a33a'
  surface: '#ffffff'
typography:
  sans:
    fontFamily: 'Sarabun, system-ui, sans-serif'
  heading:
    fontFamily: 'Prompt, Sarabun, system-ui, sans-serif'
rounded:
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
spacing:
  page-max: '1360px'
  detail-max: '1080px'
  section-gap: '30px'
components:
  tool-tile: {}
  command-search: {}
  category-pill: {}
  tool-workspace: {}
  button: {}
  field: {}
---

# ToolSiam Design System

## Overview

ToolSiam is a Thai utility platform for everyday calculations, text, dates and QR tasks on mobile and desktop. The current frontend brief authorizes replacing the old article-card presentation across the application. The signature is a compact tool launcher with softly raised utility icons and a green tax tile illustrated as a Thai financial document. Familiar form controls take priority inside tools.

Product register throughout discovery and tool routes; horoscope and dream content retain explicit belief labels. No traffic statistics are invented: featuredRank is an editorial recommendation. Avoid article thumbnails, dashboard chrome, neon, glass on every card, and oversized marketing heroes.

Runtime ownership is model B: `src/styles/global.css` owns palette, fonts and theme ramps; `src/styles/product.css` owns product geometry, accent palette and motion. This document mirrors those sources and is not a code generator.

## Colors

Action uses primary and primary-hover in both themes with white text. Existing brand-700 is the theme-aware link/focus color. Existing slate ramps retain their light/dark meanings. Category accents are mixed into the current surface; they are never used alone as small body text. Error and warning colors retain their existing semantic tokens.

| Document value                                            | Runtime owner                                         | Consumers                                |
| --------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| primary / primary-hover                                   | global.css `--color-action`, `--color-action-hover`   | Button, SearchField, selected pills      |
| mint / blue / orange / lime / violet / rose / teal / gold | product.css `--color-accent-*`                        | ToolIcon containers, tool/vertical tiles |
| surface                                                   | global.css `--color-surface`                          | All surfaces; dark override #161616      |
| rounded.md / rounded.xl                                   | product.css `--radius-control`, `--radius-tile`       | Fields, buttons, tiles, workspace        |
| page-max / detail-max                                     | product.css `.site-container`, `.site-content-narrow` | Base and navigation                      |

Theme preference persists under the existing toolsiam-theme key. System preference is the default, and the existing pre-paint script prevents theme flash. Forced colors preserve system scrollbars.

## Typography

Self-hosted Prompt 500 for headings, Sarabun 400/500/600 for body and controls. Keep Thai diacritics clear with heading line-height at least 1.45 and descriptions 1.7. Hero 29–46px, page title 24–34px, section title 20–23px, tile name 16–18px, descriptions 13–14px, fields 16px. Numeric results use tabular figures. Full original tool names remain in H1, metadata and accessible link labels.

## Layout

1360px outer container with 16/20/24px gutters; tool detail uses 1080px. Hero → search → quick links → categories → recommended tools → live lottery information → belief destinations. Four-column desktop bento has one two-column tile; laptop uses three columns with a tall featured tile; tablet/mobile use two columns with a full-width featured tile. Catalog uses one/two/three/four columns at the existing 640/1024/1180 breakpoints. Category pills wrap on larger screens; home uses two horizontally scrollable rows on mobile with a visible scrollbar and keyboard-reachable links. No fixed-height page shells.

## Elevation & Depth

Icons have a small inset reflection and lower edge. Hover lifts tiles by 3px, icons by 2px with a 3-degree rotation, and launch arrows by 2px. Only header and search overlay use blur/elevated layering. CSS/SVG only, no 3D runtime or background video. Search results overlay the document without pushing content; loading reserves a workspace frame.

## Shapes

Controls 12px, secondary surfaces 16px, primary tiles/workspace 20px. Mobile tiles use 16px. Pills are fully rounded because they represent category navigation. Existing alerts and compact table fields keep their established 8–10px geometry.

## Components

ToolCard is shared by Astro static pages and React catalog results, with one featured variant; ToolIcon reuses the existing category SVG source and adds selected tool-specific paths. Tool presentation copy is separate from SEO metadata. SearchField owns input, clear, focus restoration and optional submit; ToolSearch owns discovery filtering and URL state. CategoryPill uses links for navigation and aria-pressed buttons for filtering. SectionHeader is static.

ToolShell puts the tool UI before long descriptions, sources, examples, instructions and FAQs. Existing calculations, validation, API behavior, routes and structured data remain owned by their current modules. ResultBox, Button and field styles provide consistent tool UI. Native Select popups remain OS-owned. DatePicker owns the date popup, Thai calendar layout and theme.

Motion tokens: fast 150ms, normal 200ms, entrance 300ms, easing cubic-bezier(.2,.7,.2,1); small 45/90ms entrance staggering. Reduced motion disables entrance, hover displacement and smooth scrolling. Visible focus applies to all controls. Use text with color for status; do not add false buttons or fabricated output.

Global scrollbar colors consume slate tokens with hover/active feedback. Local search stays immediate and needs no remote debounce. Placeholder copy is static to avoid motion distraction and retain the user's prompt while typing.

## Do's and Don'ts

- Do place tools before explanatory content and preserve all SEO text and destinations.
- Do preserve Thai labels, long-name wrapping, clear buttons and keyboard equivalents.
- Don't add dependencies for animation or show popularity without usage evidence.
- Don't use hardcoded light pastel backgrounds with dark-mode foreground text.

## September 9 refinement

Dark mode uses a neutral black canvas (#0a0a0a), raised surface (#161616), control/hover gray (#202020) and border gray (#333333), for both explicit and system preferences. Ambient green is disabled in dark mode and the site footer uses the neutral raised surface; green remains an action and category accent.

ToolHelp owns a numbered instruction rail and native details/summary FAQ rows. Answers remain in server HTML and each row toggles independently with keyboard support; the first answer starts open. The shared workspace toolbar describes the area instead of claiming runtime readiness.

LotteryBanner uses one surface with four prize groups separated by hairlines, two columns on mobile, and an action footer. Preserve prize labels, leading zeros, draw date, verification status, official source and LiveDrawNotice freshness behavior.

The shared DatePicker uses a 360px bounded panel, 20px corners, neutral theme surfaces, green selection, an outlined today marker and a six-row grid to keep month navigation stable. The trigger displays Thai month and Buddhist year; users can jump directly by month/year, choose today, or clear. Placement uses the dialog top layer so workspace clipping cannot cut off the calendar.
