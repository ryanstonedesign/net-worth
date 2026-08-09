# Worthfolio Limestone Visual Migration Plan

Status: phase-one implementation complete (August 9, 2026)

Branch: `codex/limestone-design`

Typography: Instrument Serif + Inter

Reference specification: `/Users/ryanstone/Documents/Codex/2026-08-08/referenced-chatgpt-conversation-this-is-an/outputs/design.md`

Reference assets: `/Users/ryanstone/Documents/Codex/2026-08-08/referenced-chatgpt-conversation-this-is-an/outputs/worthfolio-asset-pack-v1.zip`

The shared system, app surfaces, landing page, metadata, local fonts, preference fallbacks, and chart code split are implemented. The automated suite passes 43/43, and normal plus GitHub Pages production builds pass. Responsive width-specific art exports, WebGL, and dark mode remain documented follow-ups rather than phase-one dependencies.

## 1. Objective

Move the Worthfolio app and landing page from the current cool-white, indigo, seafoam, card-based “Column” visual language to the new “Digital Stonework / Sculpted Wealth” direction:

- one warm ivory limestone canvas;
- deep-forest action and data inlays;
- rare display-serif focal moments with quiet sans-serif utility;
- consistent raised, flush, recessed, engraved, and inlaid depth semantics;
- restrained, damped motion;
- bas-relief imagery on the landing page;
- data-first treatment in the app.

This is not a product redesign. App behavior and app content are frozen. Landing-page structure and copy may change.

## 2. Non-negotiable scope guardrails

### App: visuals only

Preserve all of the following exactly:

- visible strings, labels, terminology, values, and explanatory copy;
- the order and availability of controls;
- calculations, forecasting logic, storage, encryption, sync, and import behavior;
- `useVault()` stages and the current no-router state model;
- callback contracts, event handlers, long-press month navigation, focus behavior, and keyboard behavior;
- scenario creation, selection, rename, sync, delete, and transition triggers;
- dashboard content order and every empty, estimated, error, loading, success, destructive, and disabled state;
- Ask Worthfolio consent, prompts, evidence, what-if, save, and message behavior;
- account, authentication, recovery, and theme-editor functionality;
- persisted and cloud-synced design-token overrides.

Permitted app changes are CSS, font and asset loading, visual wrappers/hooks, icon artwork, presentational SVG attributes, and motion styling. If JSX must change, keep strings, DOM meaning, handlers, and state transitions intact.

The app-specific IA and workflow recommendations in the new `design.md` are out of scope where they would add, remove, rename, reorder, or change anything. In particular, do not add a review step, assumptions panel, recent-snapshots section, new navigation destinations, a chart-data control, or new disclosure copy without separate approval.

Internal identifiers such as `forecastData` also remain unchanged. Landing copy may use “projection,” but app copy is frozen even where it differs from the new product-language guidance.

### Landing page: visual and editorial rebuild allowed

Preserve only the integration contract:

- `LandingPage({ onGetStarted, onSignIn })`;
- the current transition from marketing to `AuthScreen`;
- the inner `.lp` scrolling surface while `body` remains `overflow: hidden`;
- legacy/local-only mode continuing to bypass marketing;
- the GitHub Pages base-path behavior.

Landing sections, copy, imagery, metadata, anchors, and layout may be rebuilt. Claims must be supported by the repository and must not overstate projections, pricing, export, or privacy.

## 3. Current implementation summary

### Shared foundation

- `src/index.css` is a 3,227-line global stylesheet containing tokens, app styles, landing styles, the design-system editor, and dormant UI.
- `src/lib/theme.js` exposes legacy `--c-*`, radius, shadow, and font variables to a live editor; overrides persist locally and sync inside the encrypted data container.
- `index.html` loads Google-hosted Inter, JetBrains Mono, and Fira Code and uses the old cool canvas as `theme-color`.
- There is no `public/` or source asset library for the brand.

### App

- `src/App.jsx` is a state machine, not a router.
- Mobile uses a push-aside scenario drawer, floating top controls, inset sheets, and a fixed month selector.
- Desktop uses a permanent 280 px sidebar, a 900 px content cap, centered dialogs, and a 400 px docked Ask panel.
- The dashboard is the only live product page. `Manage`, `UpdateMonth`, `BottomNav`, and `UpdateCategorySheet` are dormant.
- Visual state is spread across global CSS, about 95 reachable inline-style sites, inline SVGs, and hard-coded chart colors.

### Landing page

- `src/components/LandingPage.jsx` is a single self-contained component with 4,320 decorative halftone circles, two repeated phone mocks, seven bento cards, and inline icons.
- It uses generic white cards, glass/frosted surfaces, rainbow decoration, indigo/seafoam/orange accents, and Inter-only typography.
- It has no route split, landing tests, source imagery, local fonts, description, canonical metadata, social metadata, or favicon integration.

### Verified baseline

- `npm test`: 43/43 tests pass.
- `npm run build`: passes; existing bundle-size warnings remain.
- The working tree was clean at the end of the audit.
- Desktop and mobile visual inspection confirmed the current shell, drawer, dashboard, and sheet behavior described above.

## 4. Gap analysis

| Area | Current | Limestone target | Migration implication |
|---|---|---|---|
| Canvas | Cool `#F6F6F8` | Warm `#F3EFE6` limestone | Replace the global visual foundation and `theme-color`. |
| Structure | White floating cards | One continuous mineral plane | Reclassify existing surfaces by meaning; do not skin every card with a stone shadow. |
| Primary action | Indigo | Deep forest `#173F32` | Retokenize controls and selected data. |
| Typography | Inter throughout | Display serif for rare focal values; Inter for UI | Resolve and self-host fonts before final optical tuning. |
| Data | Green/red directional chart with 28% fills | Neutral forest history, dashed projection, ≤8% fills | Refactor presentational chart colors only; preserve data and interactions. |
| Navigation | Frosted/glass controls | Flush or raised cut-stone controls | Remove glass and blur while preserving positioning and drawer behavior. |
| Inputs | White boxes/underlines | Clearly labeled shallow recesses | Apply one recessed recipe and compliant focus treatment. |
| Modals | Large radii, heavy blur | Raised planes, restrained forest scrim | Restyle shared `Modal` without changing modal flow. |
| Motion | Full-width scenario push, 1.1 s chart draw, page-load rolling | Short, damped, local movement | Change animation presentation and reduced-motion handling only. |
| Landing art | Halftone + HTML phone mock | Canonical nature relief + bas-relief feature art | Rebuild landing structure around curated supplied assets. |
| Brand | Plain text / trend glyph | W tile + live-text wordmark | Add the canonical lockup; never ship an outlined wordmark. |
| Accessibility visuals | No global `:focus-visible`; undersized landing targets | Visible 2 px focus, 44 px targets, preference fallbacks | Add visual accessibility states without adding app features or copy. |

## 5. Resolved design decisions

These decisions govern implementation where the supplied package is ambiguous or incomplete:

1. **Typography:** use self-hosted Instrument Serif with Inter. Instrument Serif Regular is the display face for the landing hero, major editorial headings, the primary app net-worth value, and the live Worthfolio wordmark. Instrument Serif Italic is optional and limited to rare editorial accents. Inter 400/500/600 handles all body copy, navigation, controls, forms, tables, chart labels, metadata, and supporting financial values. Do not use Instrument Serif for dense UI or routine text below 20 px; the live wordmark is the sole permitted small-size brand exception and should target 20 px where space permits.
2. **Live wordmark wins:** `design.md` repeatedly requires selectable live text. Ignore the asset README line that says to convert it to outlines.
3. **Primary mark usage:** use the embossed primary mark at 40 px and above; use the flat or reversed mark below 40 px or when contrast demands it.
4. **Light theme first:** the primary deliverable is the light limestone theme. Do not automatically add an app dark mode in this pass; the current product has no dark-mode behavior and the pack has no dark artwork. Keep dark tokens possible, but treat activation and dark art as a separately approved follow-up.
5. **Static hero first:** WebGL is not phase-one work. The pack contains material maps, not a modeled valley scene or suitable landscape height map, and exceeds its own WebGL texture budget.
6. **App emoji exception:** existing user-selected category emoji are user content and must remain. Apply the new icon style to application chrome only.

## 6. Production asset policy

Do not copy either ZIP wholesale. Import a curated production subset from the full asset pack only; the logo ZIP is a byte-identical subset.

### Ship

- `worthfolio-mark-primary.svg`
- `worthfolio-mark-flat.svg`
- `worthfolio-mark-reversed.svg`
- `worthfolio-app-icon.svg`
- `favicon.svg`
- raster favicon, touch icon, and 512 px app icon as needed
- `hero-nature-valley-v2.avif` and `.webp`
- `illustration-history-v1.avif` and `.webp`
- `illustration-scenarios-v1.avif` and `.webp`
- `illustration-compounding-v1.avif` and `.webp`
- `illustration-monthly-record-v1.avif` and `.webp` only if used
- `og-worthfolio-1200x630.jpg`
- individual icons from `icon-sprite.svg` only where its 12-symbol coverage is sufficient

### Do not ship

- `hero-digital-stonework-v1` (explicitly deprecated)
- anything under `archive/`
- outlined/vectorized wordmarks or combined lockups
- short alias duplicates such as `mark-primary.svg`
- previews, contact sheets, prompts, source-generation files, or source PNGs
- the 2–2.6 MB illustration PNGs in the application bundle
- generic WebGL material maps until a real WebGL phase is approved

### Repair or regenerate before use

- The 536-byte noise WebP is effectively flat, while the visible PNG is 221 KB. Produce a subtle, seamless WebP/AVIF texture under 35 KB and verify it at 200% zoom before enabling grain.
- Generate width variants from the supplied source artwork for responsive `srcset`; retain AVIF first and WebP fallback.
- Normalize production exports to sRGB.
- Validate favicon legibility in real browser chrome and create any missing platform/maskable variants only if the deployment actually uses them.

Recommended repository locations:

```text
src/assets/worthfolio/brand/
src/assets/worthfolio/art/
src/assets/worthfolio/texture/
public/brand/                 # only browser-manifest/favicon assets that need stable URLs
```

Use imported source assets inside React so Vite rewrites `/net-worth/` base paths correctly. Use `%BASE_URL%` or the equivalent for `public/` metadata paths.

## 7. Token foundation

### 7.1 Split and layer the stylesheet

Turn `src/index.css` into an ordered entry point rather than continuing to grow one global file:

```text
src/styles/tokens.css
src/styles/base.css
src/styles/surfaces.css
src/styles/components.css
src/styles/app.css
src/styles/landing.css
src/styles/preferences.css
src/index.css                 # imports/layers only
```

Use CSS layers in this order:

```css
@layer reset, tokens, base, surfaces, components, app, landing, utilities, overrides;
```

Keep app and landing selectors scoped separately. Preserve generic class contracts such as `.btn`, `.input`, and `.modal-*` until all reachable consumers have migrated.

### 7.2 Establish semantic tokens

Add the reference palette, spacing, radius, motion, surface-shadow, typography, chart, and z-index tokens. Components consume semantic roles such as:

- `--bg-canvas`, `--bg-raised`, `--bg-recessed`;
- `--text-primary`, `--text-secondary`, `--text-muted`;
- `--action-primary`, `--action-hover`, `--action-pressed`;
- `--border-subtle`, `--border-control`, `--focus-ring`;
- `--chart-history`, `--chart-projection`, `--chart-grid`, `--chart-marker`;
- `--surface-raised-shadow`, `--surface-recessed-shadow`, `--surface-pressed-shadow`;
- `--duration-*` and `--ease-*`;
- `--z-base` through `--z-toast`.

Do not freeze the reference contrast failures into production:

- darken muted text from `#6E756F` to `#606761` so it remains AA-safe on both the ivory canvas and the deeper recessed surface;
- use a control boundary at least as dark as `#8C877E` when the boundary is the only visual identifier (about 3.11:1);
- retain pale sage only for nonessential decoration, or introduce a stronger sage such as `#6B7D6D` for meaningful strokes;
- verify every final token pair in the style tile rather than assuming the specification is AA-safe.

### 7.3 Preserve the theme editor

Do not delete, rename, or clear persisted `--c-*`, `--r-*`, shadow, or font overrides. Make the new semantic layer derive from the existing editable hooks so `src/lib/theme.js` and `StickerSheet` continue to work:

- `--bg-canvas` derives from `--c-bg`;
- `--bg-raised` derives from `--c-surface`;
- `--text-primary` derives from `--c-ink`;
- `--text-muted` derives from `--c-ink-mute`;
- `--action-primary` derives from `--c-primary`;
- `--border-subtle` derives from `--c-border`;
- shared radii derive from `--r-card` and `--r-btn` where editable behavior is expected.

Add new internal tokens for semantic depth without exposing new editor fields in this pass, because app content is frozen. Test both a clean profile and a profile with saved/synced overrides.

### 7.4 Font delivery

- Add `InstrumentSerif-Regular.woff2` and `InstrumentSerif-Italic.woff2` from the official SIL OFL 1.1 Instrument Serif distribution. The Regular cut is required; include Italic only if an approved design actually uses it.
- Add a self-hosted Inter Variable WOFF2 covering weights 400–600. Do not load unused light, bold, or italic ranges.
- Store webfonts under `src/assets/worthfolio/fonts/` and retain their license files in the repository.
- Define explicit `@font-face` rules with `font-display: swap`. Preload Instrument Serif Regular and the primary Inter file only when they are used above the fold.
- Use `"Instrument Serif", Georgia, serif` as the display stack and `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` as the interface stack.
- Apply Instrument Serif Regular to the landing hero, major editorial headings, the app's primary net-worth value, and the live Worthfolio wordmark. Keep every operational or dense surface in Inter.
- Remove Google font stylesheet and preconnects once local fonts are in place.
- Update the CSP in `vite.config.js` to permit `'self'` for `font-src`.
- Keep Instrument Serif out of controls, forms, tables, tooltips, body copy, chart labels, supporting values, and routine text below 20 px.
- Verify fallback rendering and layout shift with both custom fonts blocked; final hierarchy and controls must remain readable and stable.

## 8. Build a visual style tile first

Use the existing `StickerSheet` as the implementation proving ground rather than creating a separate, disconnected demo. Restyle it while keeping its labels and editing behavior unchanged.

The style tile must approve:

- brand lockup at large, small, forced-colors, and dark-surface placements;
- display and interface typography with large and extreme currency values;
- the five depth roles: raised, flush, recessed, engraved, inlaid;
- buttons in default, hover, focus-visible, pressed, disabled, and loading states already present in the app;
- inputs, selects, segmented controls, switches, checkboxes, popovers, sheets, and dialogs;
- metric groups, category/account rows, badges, error states, and destructive confirmation;
- chart history, projection, goal, grid, tooltip, and empty state;
- grain on/off at normal and 200% zoom.

Do not move into page-level work until the style tile passes contrast, focus, and depth-semantics review.

## 9. App visual migration

### 9.1 Shared primitives

Primary files:

- `src/index.css` and the new `src/styles/*` files
- `src/components/Modal.jsx`
- `src/components/Popover.jsx`
- `src/components/StickerSheet.jsx`
- `src/lib/theme.js`
- `index.html`
- `vite.config.js`

Work:

- Replace generic card elevation with explicit feature-plane, recessed-well, and raised-instrument styles.
- Make primary buttons forest/ivory, secondary buttons lightly raised limestone, tertiary buttons containerless, and destructive color strongest at confirmation.
- Make inputs/selects shallow recessed wells with visible labels, strong boundaries, and immediate focus rings.
- Restyle tabs/toggles as a recessed rail with a nearly flush selected segment.
- Remove glassmorphism, large backdrop blur, glossy gradients, and arbitrary shadow stacks.
- Normalize radii to 4/8/12/18 px roles while retaining circles for avatars/icon buttons and pills only for true badges/switches.
- Migrate reachable presentational inline styles to classes/tokens so the new system actually reaches them; do not touch data-dependent logic.

### 9.2 Brand and shell

Primary files:

- `src/App.jsx`
- `src/components/SideNav.jsx`
- `src/components/TopNav.jsx`
- `src/components/UserMenu.jsx`
- `src/components/SyncIcon.jsx`

Work:

- Add the canonical W tile plus live-text “Worthfolio” lockup in the side rail; preserve the existing word text.
- Change the desktop side rail from a cool bordered panel to the same limestone plane with an engraved boundary and shallow active track/inlay.
- Target the specification’s 240 px expanded rail only after verifying long scenario names, the user footer, and docked Ask geometry; keep the JS/CSS breakpoint synchronized.
- Remove the frosted top fade. Make top controls flush or raised limestone instruments with the Ask action in forest.
- Keep the current mobile push-drawer interaction and all positioning infrastructure; change only its materials, shadow, scrim, and easing.
- Preserve scenario state and event triggers, but replace the full-viewport visual slide with the shorter fade/4–8 px material transition described by the reference where CSS can do so safely.
- Keep sync badges and status copy unchanged; use icon/shape plus color so status is not color-only.

### 9.3 Dashboard and chart

Primary files:

- `src/pages/Dashboard.jsx`
- `src/components/NetWorthChart.jsx`
- `src/components/RollingNumber.jsx`
- `src/components/CategoryCard.jsx`
- `src/components/MonthSelector.jsx`

Work:

- Use the display serif for the primary net-worth value only; keep labels, deltas, controls, and dense numbers in Inter with tabular figures.
- Keep the existing dashboard sequence, but use desktop CSS layout and whitespace to allow the chart/data region to breathe beyond the current 900 px cap where useful.
- Put the chart in a shallow recessed well. Use forest for history, a lighter dashed projection, engraved grid/crosshair, minimal markers, and fills below 8% opacity.
- Stop changing the main data path to green/red based on direction. Keep positive/negative meaning in the existing delta text and icons/labels.
- Replace hard-coded chart/goal/tooltip colors with semantic visual tokens without changing Recharts data, interpolation, click, tooltip, goal, or selection behavior.
- Reduce initial draw timing toward 720 ms and make reduced-motion render final geometry immediately.
- Remove artificial roll-from-zero on initial load; retain restrained number animation after existing user-triggered changes only.
- Style the range control as a recessed segmented rail without changing its five choices or custom-year behavior.
- Present Assets and Liabilities as an aligned metric group separated by engraved rules rather than two floating cards. Keep both labels and values unchanged.
- Treat category sections as recessed records/feature planes with engraved account separators. Preserve every input, placeholder, contribution row, projected-value marker, total, edit button, and category order.
- Preserve user category colors and emoji; place them in restrained wells rather than replacing user data.
- Restyle the fixed month selector as one raised instrument while preserving its position, safe-area handling, long-press acceleration, and “Back to this month” behavior.

### 9.4 Sheets, settings, account, and import

Primary files:

- `src/components/EditCategorySheet.jsx`
- `src/components/NewScenarioSheet.jsx`
- `src/components/PrototypeSettings.jsx`
- `src/components/ImportSheet.jsx`
- `src/components/AccountModal.jsx`
- `src/components/RecoveryPhraseInput.jsx`

Work:

- Restyle the shared sheet/dialog plane first so all flows inherit the same material.
- Keep desktop widths and mobile bottom-sheet/full-height behavior functionally identical.
- Use an unblurred 20–28% neutral forest/graphite backdrop.
- Convert settings rows, import review rows, recovery phrase, account avatar/actions, sign/rate editor, and source/mapping controls into the approved surface roles.
- Preserve destructive labels and confirmation order exactly.
- Verify fixed headers/footers, long scroll bodies, mobile keyboard, and 200% zoom after every surface change.

### 9.5 Ask Worthfolio

Primary file: `src/components/AskWorthfolio.jsx`

Work:

- Keep mobile overlay and desktop docked behavior unchanged.
- Treat the panel as a raised cut-stone plane; consent/evidence as recessed information; selected/saved state as forest inlay.
- Remove glass/pill styling that does not encode status.
- Preserve all consent text, starters, messages, evidence, thinking, errors, what-if controls, and composer behavior.
- Recheck the app-shell right margin, dashboard width, fixed month selector centering, and popover stacking at the 900 px breakpoint.

### 9.6 Authentication and recovery

Primary files:

- `src/components/AuthScreen.jsx`
- `src/components/LockScreen.jsx`
- `src/components/RestoreAccessScreen.jsx`
- `src/components/RecoveryPhraseSetup.jsx`

Work:

- Add the same canonical brand treatment without changing any strings.
- Use one restrained raised plane over the continuous canvas; inputs remain recessed.
- Style warnings, errors, recovery phrase blocks, success, disabled, and mode switches consistently.
- Preserve password-manager attributes, paste behavior, submit state, and every recovery branch.

### 9.7 Dormant UI

Do not spend bespoke redesign effort on currently unimported `Manage`, `UpdateMonth`, `BottomNav`, or `UpdateCategorySheet`, or on the unreachable `PrototypeSettings` main view. Shared tokens/primitives may update their appearance incidentally. Keep them compiling and do not delete them in a visual-only change.

## 10. Landing-page rebuild

### 10.1 Component structure

Refactor `src/components/LandingPage.jsx` into a small composition while retaining its callback contract:

```text
src/components/landing/BrandLockup.jsx
src/components/landing/ResponsiveArtwork.jsx
src/components/landing/ProjectionPreview.jsx
src/components/landing/LandingNav.jsx
src/components/landing/LandingSection.jsx
src/components/LandingPage.jsx
src/styles/landing.css
```

Remove `HalftoneField`, the repeated `PhoneMock`, old bento data, old tile visuals, and obsolete inline icon set after the new structure is verified.

### 10.2 Proposed information architecture and copy direction

1. **Navigation**
   - Canonical live-text lockup.
   - Anchors: Product, How it works, and Privacy/Security only if the linked claim is substantiated.
   - Keep Sign in and the primary onboarding CTA exposed on mobile.

2. **Hero**
   - Overline: “Wealth planning, through time.”
   - H1: “See the shape of your wealth.”
   - Supporting idea: record where you are each month, explore what could come next, and keep the long view in focus.
   - Primary action calls `onGetStarted`; tertiary “See how it works” scrolls to the walkthrough.
   - Use a five-column copy/seven-column contained-art layout with `hero-nature-valley-v2`; copy stays HTML and does not overlay busy imagery.

3. **Product truth**
   - Three engraved statements: record monthly account values; preserve a clear financial history; explore scenarios with adjustable assumptions.

4. **Historical record**
   - Message: “A record you own, one month at a time.”
   - Use `illustration-history-v1` and an accurate, decorative product proof based on current UI/data semantics.
   - Explain manual entry as deliberate control, not a missing bank integration.

5. **Scenarios**
   - Use `illustration-scenarios-v1`.
   - Show illustrative contribution, growth rate, horizon, and starting balance as visible assumptions; use plausible numbers and conditional language.

6. **Accounts and total worth**
   - Show multiple accounts rolling into one total using aligned rows and engraved rules, not floating metric cards.

7. **Compounding**
   - Use `illustration-compounding-v1` with concise copy about consistency and time.

8. **How it works**
   - Add accounts → record a monthly snapshot → compare projections.
   - Use a simple vertical sequence on mobile; no scroll-jacking.

9. **Principles**
   - Full history, visible assumptions, deliberate monthly reflection, and a calm long-term view.

10. **Final CTA and footer**
    - One monolithic CTA plane with one onboarding action. Sign in remains in navigation rather than competing in the final panel.
    - Include only real links. Do not invent company, legal, support, or social destinations.
    - Place conditional projection language near the relevant preview and/or footer.

### 10.3 Claim audit

Before copy lock:

- AES-GCM with 256-bit keys is supported by the implementation.
- Remove “Export any time”; there is no general export path in the repository.
- Remove or confirm “Free to start”; there is no pricing source in the repository.
- Qualify privacy copy to the encrypted synced vault. “Not even we can read it” is too broad without explaining that Ask Worthfolio can transmit selected context after consent.
- Use “projection,” not “forecast,” on the landing page and avoid guarantees or advice language.
- Do not add press logos, trust badges, customer counts, or performance claims without evidence.

### 10.4 Static media and performance

- Use `<picture>` with AVIF first, WebP fallback, explicit dimensions/aspect ratio, and intentional `object-position` from the asset guidance.
- Prioritize only the hero image; lazy-load below-fold art.
- Add the repaired micro-texture once at page/surface level and disable it for forced colors, increased contrast, print, and reduced-data conditions.
- Split the public landing route from heavier authenticated app/auth surfaces with lazy imports while preserving identical visible transitions.
- Remove the 4,320-circle halftone SVG and duplicate HTML phone mock.
- Target LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1, initial imagery ≤900 KB, and landing JS near the specification’s 170 KB gzip target.

Implementation note: the canonical AVIFs are already compact (roughly 81–141 KB each), the hero is the only eager image, and below-fold artwork is lazy. Width-specific exports remain a follow-up because the supplied package does not include them; reduced-data mode avoids mounting the image sources entirely.

### 10.5 Metadata

Update `index.html` and build metadata with:

- warm `theme-color`;
- description and canonical URL once the deployment origin is confirmed;
- Open Graph/Twitter metadata using the supplied OG image;
- SVG favicon, PNG fallback, and Apple touch icon;
- no obsolete Google font origins after self-hosting.

Critical marketing copy is currently unavailable without JavaScript. Treat prerender/SSR as a separate architecture follow-up unless the scope is expanded; it should not block the visual migration.

## 11. Preferences, responsive behavior, and motion

### Preferences

- `prefers-reduced-motion`: disable page smooth scrolling, chart drawing, number rolling, scenario travel, cursor lighting, and decorative reveals.
- `prefers-contrast: more`: remove grain, strengthen boundaries, and avoid relief-only separation.
- `forced-colors: active`: remove texture/shadows, use system borders/colors, flat logo, and visible selection/focus.
- Reduced data: do not load texture or optional cinematic media; use the same static content hierarchy.
- Do not activate automatic dark mode in phase one; keep the token architecture ready for a later approved dark pass.

### Responsive targets

Test composition changes around 480, 768, 1024, 1280, and 1536 px while keeping the app’s functional 900 px JS/CSS breakpoint synchronized until intentionally refactored.

Validate at 320, 375, 390, 768, 900/901, 1024, 1440, and 1920 px:

- no accidental horizontal scroll;
- all targets at least 44 × 44 px;
- primary landing CTA before 700 px of mobile scroll;
- charts remain usable and at least 320 px tall where the current layout permits;
- fixed controls respect safe-area insets and mobile browser chrome;
- long scenario/account names and large currency values do not clip;
- 200% zoom works, with required content reflow at 400%.

### Motion

- 80 ms acknowledgement, 140 ms hover/press, 220 ms controls, 320 ms surfaces, 480 ms data, 720 ms reveals.
- No bounce, shake, scale-heavy hover, looping pulse, or full-viewport ornamental travel.
- Preserve immediate interaction availability; no routine control waits for animation.
- Focus rings appear immediately and never animate.

## 12. Optional WebGL follow-up

Do not begin until the static landing page is accepted and performance is measured.

Required new inputs:

- a real valley mesh or 16-bit landscape displacement map matching the canonical hero;
- compressed material maps totaling under the agreed texture budget;
- a lazy-loaded renderer, preferably behind a dedicated `HeroRelief` boundary;
- exact static-picture fallback parity;
- context-loss recovery and fallback;
- offscreen/hidden-document pause;
- device-pixel-ratio cap and low-power/data/reduced-motion gates.

WebGL must remain decorative, must not delay copy or CTA, and must not run in the app.

## 13. Verification plan

### Automated baseline

- `npm test`
- `npm run build`
- bundle-size comparison before/after
- no new console errors or warnings beyond documented existing build warnings

### Behavior parity smoke tests

Verify without changing expected behavior:

- landing → sign up, landing → sign in, auth back → landing;
- every `useVault()` stage;
- current/past/future month navigation and long press;
- all five time ranges and custom year;
- set/edit/clear goal;
- add/edit/delete category and account, contribution and growth editing;
- create/select/rename/sync/delete scenario;
- mobile drawer, desktop sidebar, user popover, docked Ask panel;
- import CSV/PDF paths and review states;
- account/profile/password/recovery/delete flows;
- Ask consent, starters, custom message, evidence, what-if, save, clear, errors;
- theme editor with clean, local-overridden, and synced-overridden tokens.

### Visual regression matrix

Capture at mobile and desktop minimum:

- landing hero at top and scrolled nav;
- landing at 320, 375, 768, 1024, 1440, and 1920 px;
- landing image/font failure, reduced motion, forced colors, increased contrast, and reduced data;
- dashboard empty, typical, dense, positive, negative, neutral, actual, estimated, and extreme-value states;
- empty/historical/projected chart, goal unset/set/reached/unreachable, tooltip, selected month, every range;
- category empty, normal, contributing, focused, estimated, overridden, and liability states;
- drawer open/closed, one/multiple scenarios, rename/popover/sync/delete states;
- short/long mobile sheet, desktop dialog, fixed footer, sub-view back, keyboard open, 200% zoom;
- every auth, recovery, import, account, Ask, loading, disabled, success, error, and destructive state.

### Accessibility visual QA

- Run an automated scanner and manually test keyboard-only focus order.
- Verify focus ring contrast on every surface.
- Verify text, meaningful graphic, and control-boundary contrast.
- Confirm no status or selected state relies on color alone.
- Confirm reduced motion removes decorative movement without blank spaces.
- Confirm forced colors retains controls, boundaries, selection, and focus.

### Browser/base-path QA

- Chromium, Safari, and Firefox.
- Fine and coarse pointers.
- Normal Vite root and GitHub Pages `/net-worth/` base.
- Real browser favicon and touch-icon review.

## 14. Recommended implementation sequence

1. Curate production assets and import the approved Instrument Serif + Inter webfonts and license files.
2. Build the corrected token layer and self-hosted font delivery.
3. Approve the `StickerSheet` style tile, including contrast and all depth roles.
4. Migrate shared primitives: buttons, inputs, toggles, surfaces, popovers, dialogs, focus, and preference fallbacks.
5. Migrate the app shell and navigation while preserving positioning infrastructure.
6. Migrate dashboard, chart, categories, metrics, and month selector.
7. Migrate sheets, settings, import, account, Ask, auth, and recovery surfaces.
8. Rebuild the landing page around the static canonical hero and bas-relief assets.
9. Add metadata, responsive asset variants, lazy loading, and route-level code splitting.
10. Run the full parity, visual, responsive, accessibility, base-path, and performance matrix.
11. Tune or remove effects that do not carry semantic meaning.
12. Consider WebGL and dark mode only as separately approved follow-ups.

## 15. Definition of done

- The app’s content and functionality are unchanged under behavior-parity testing.
- The landing page tells the monthly-history/scenario story accurately and uses no unsupported claims.
- Both surfaces read as one warm, restrained limestone system rather than a stone texture applied to generic cards.
- Every depth cue has a consistent semantic role.
- Data remains clearer than the material effect.
- The canonical mark and live-text wordmark are used correctly.
- Typography, contrast, target sizes, focus, reduced motion, forced colors, and responsive reflow pass the agreed QA matrix.
- The experience remains coherent with texture, custom fonts, animation, and optional cinematic media disabled.
- Static landing performance meets the agreed budget before any WebGL work begins.
