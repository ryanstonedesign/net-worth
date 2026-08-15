# Worthfolio Design System — Holographic Calm

> **Version:** 1.0  
> **Status:** Product design specification  
> **Primary platform:** Mobile-first responsive web app / PWA  
> **Default appearance:** Light mode  
> **Design direction:** Holographic Calm  
> **Product category:** Private net-worth tracking, forecasting, scenario planning, and AI-assisted financial insight

---

## 0. Purpose of This Document

This document is the source of truth for the visual, interaction, motion, and implementation design system for Worthfolio.

Worthfolio should feel like a **premium future-facing wealth operating system**: calm, private, precise, intelligent, and unusually beautiful. The experience should communicate that the product is sophisticated enough for serious wealth planning while remaining approachable for users who are still early in their financial journey.

The aesthetic must avoid the two common failure modes for wealth software:

1. **Traditional/private-bank imitation** — beige, serif-heavy, old-world, conservative, static, and archaic.
2. **Crypto/trading-terminal futurism** — dark, neon, hyperactive, aggressive, overly technical, and visually noisy.

Worthfolio instead occupies the space between those poles.

The target is:

> **A luminous, glassy, ultra-modern financial system with the calmness of luxury industrial design and the precision of a high-end instrument.**

The UI should feel alive because of **light, translucency, layering, blur, gradients, edge illumination, data motion, and subtle texture** rather than decorative ornament.

---

# 1. Brand Thesis

## 1.1 Core Idea

Worthfolio helps users understand two things:

1. **What they are worth now**
2. **Where they are headed**

The interface should visually reinforce this movement from present state to future state.

The visual language should therefore emphasize:

- continuity
- trajectory
- projection
- clarity
- light
- intelligence
- confidence
- compounding
- calm control

The user should feel that their financial life has been transformed from a pile of accounts into a single legible system.

---

## 1.2 Brand Personality

Worthfolio is:

- calm
- intelligent
- private
- exacting
- ambitious
- elegant
- future-facing
- editorial
- optimistic
- high-trust

Worthfolio is **not**:

- flashy
- gimmicky
- casino-like
- meme-driven
- crypto-coded
- corporate-banking sterile
- skeuomorphic for its own sake
- nostalgic
- metallic-heavy
- aggressively masculine
- luxury through clichés

---

## 1.3 Emotional Target

When a user opens Worthfolio, the desired first impression is:

> “This feels unusually considered. It understands wealth, but it also understands software.”

The experience should feel more like opening a premium operating system or concept-car interface than opening a spreadsheet.

The user should perceive:

- technological competence
- privacy
- long-term orientation
- financial seriousness
- aesthetic discipline
- subtle optimism

---

# 2. Design Direction: Holographic Calm

## 2.1 Summary

**Holographic Calm** is a light-mode design system built from:

- pearl-white atmospheric backgrounds
- frosted translucent surfaces
- soft iridescent gradients
- cyan / teal / violet / lavender / rose light
- minimal emerald accents for positive financial states
- precise navy/slate typography
- highly controlled glows
- thin borders with spectral highlights
- layered blur
- gentle diffusion texture
- luminous chart interactions
- restrained shadows

The system should feel futuristic because light appears to pass **through** the interface rather than simply sit on top of it.

---

## 2.2 Visual Metaphor

The primary material metaphor is:

> **light passing through precision glass**

Not glassmorphism as a trend. Not frosted cards everywhere.

Instead, use transparent surfaces selectively to create a hierarchy:

- base atmosphere
- glass panels
- elevated glass
- interactive glass
- luminous focus
- spectral special state

The UI should feel optically engineered.

---

## 2.3 Design Tension

The strongest visual identity comes from balancing:

| Dimension | Too Little | Target | Too Much |
|---|---|---|---|
| Color | bland | luminous restraint | neon chaos |
| Blur | flat | layered atmosphere | unreadable mush |
| Glass | generic cards | selective optical hierarchy | glass everywhere |
| Glow | lifeless | focused energy | gaming aesthetic |
| Texture | sterile | microscopic diffusion | grainy / dirty |
| Motion | static | responsive / intelligent | playful / bouncy |
| Radius | rigid | precise softness | marshmallow UI |
| Typography | cold utility | editorial precision | fashion-magazine illegibility |

---

# 3. Color System

## 3.1 Core Neutral Palette

Use warm-to-cool luminous neutrals.

```css
--pearl-000: #FCFDFF;
--pearl-050: #F8FAFF;
--pearl-100: #F3F6FC;
--mist-100:  #EEF2FA;
--mist-200:  #E5EAF4;
--mist-300:  #D8DFEC;

--slate-500: #687286;
--slate-600: #566174;
--slate-700: #3D475A;
--slate-800: #253044;
--ink-900:   #101828;
--ink-950:   #08111F;
```

The main light-mode body background should sit between `--pearl-000` and `--pearl-100`, with soft atmospheric gradient overlays.

Pure `#FFFFFF` should be used sparingly. Prefer pearl whites because optical layers read more richly against them.

---

## 3.2 Brand Light Spectrum

### Emerald
```css
--emerald-400: #36D9A5;
--emerald-500: #16B887;
--emerald-600: #0A8F6A;
--emerald-700: #067154;
```

Use for:

- positive growth
- synced state
- historical chart emphasis
- confirmed success
- active primary action where green fits

### Teal
```css
--teal-400: #2BDCD8;
--teal-500: #18C6C5;
```

Use for:

- chart gradients
- edge illumination
- cool holographic accents

### Cyan
```css
--cyan-400: #43C8FF;
--cyan-500: #1FAFFF;
```

Use for:

- focus
- active chart point
- AI / analysis affordances
- data-selection state

### Violet
```css
--violet-400: #9B8CFF;
--violet-500: #7D6CFF;
```

Use for:

- projected data
- AI / scenario states
- special spectral edge lighting

### Lavender
```css
--lavender-300: #C5BFFF;
--lavender-400: #ADA3FF;
```

Use primarily inside gradients and ambient glows.

### Rose
```css
--rose-300: #FFA7D8;
--rose-400: #F681C3;
--rose-500: #E45AA6;
```

Use sparingly for:

- iridescent spectrum
- liabilities accent
- destructive soft glow
- special highlight

### Coral / warning
```css
--coral-400: #FF8A77;
--coral-500: #F76854;
```

### Destructive red
```css
--red-500: #E55353;
--red-600: #C73D3D;
```

---

## 3.3 Iridescent Gradients

The gradient language is essential.

### Aurora Gradient
```css
linear-gradient(
  120deg,
  rgba(43,220,216,.85) 0%,
  rgba(67,200,255,.72) 30%,
  rgba(155,140,255,.75) 67%,
  rgba(246,129,195,.65) 100%
)
```

### Soft Holographic Wash
```css
radial-gradient(circle at 15% 20%, rgba(43,220,216,.18), transparent 32%),
radial-gradient(circle at 85% 18%, rgba(155,140,255,.16), transparent 36%),
radial-gradient(circle at 60% 82%, rgba(246,129,195,.12), transparent 40%)
```

### Emerald AI Gradient
```css
linear-gradient(
  135deg,
  rgba(16,184,135,.95),
  rgba(24,198,197,.92) 48%,
  rgba(125,108,255,.86)
)
```

### Projected Data Gradient
```css
linear-gradient(
  90deg,
  rgba(22,184,135,1),
  rgba(31,175,255,.9),
  rgba(125,108,255,.86)
)
```

Do not use rainbow gradients indiscriminately. Every gradient should have a reason.

---

## 3.4 Color Distribution Rule

A typical screen should visually approximate:

- 70–80% pearl / mist / translucent neutral
- 10–15% dark typography
- 5–8% emerald / teal
- 2–5% violet / cyan / rose spectral light

Avoid screens where every component is colored.

Color is an event.

---

# 4. Background & Atmosphere

## 4.1 Default App Background

The default app background should not be flat.

Layer:

1. Pearl base
2. Fine diffusion texture
3. Low-opacity spectral radial lights
4. Optional subtle grid in data-heavy regions

Example:

```css
background:
  radial-gradient(circle at 12% 18%, rgba(43,220,216,.11), transparent 28%),
  radial-gradient(circle at 88% 8%, rgba(155,140,255,.11), transparent 32%),
  radial-gradient(circle at 70% 78%, rgba(246,129,195,.08), transparent 34%),
  #F8FAFF;
```

---

## 4.2 Texture

Use a microscopic texture overlay:

- monochrome
- 1–2% opacity
- high frequency
- no obvious repeating pattern
- no marble veining
- no heavy paper fibers

Texture should prevent gradients from feeling digitally sterile.

Conceptually:

> “subtle optical diffusion noise”

---

# 5. Glass Material System

## 5.1 Glass Levels

### Glass 0 — Bare
No glass panel. Content sits directly on atmospheric background.

Use for:

- large net-worth hero
- typography
- simple chart labels
- section headers

### Glass 1 — Quiet
```css
background: rgba(255,255,255,.38);
backdrop-filter: blur(18px) saturate(120%);
border: 1px solid rgba(255,255,255,.65);
box-shadow:
  inset 0 1px 0 rgba(255,255,255,.65),
  0 8px 24px rgba(33,45,70,.06);
```

Use for:

- cards
- rows
- simple surfaces

### Glass 2 — Elevated
```css
background: rgba(255,255,255,.52);
backdrop-filter: blur(28px) saturate(135%);
border: 1px solid rgba(255,255,255,.82);
box-shadow:
  inset 0 1px 0 rgba(255,255,255,.82),
  0 18px 48px rgba(30,40,65,.11);
```

Use for:

- modal
- bottom sheet
- main card
- important floating selector

### Glass 3 — Spectral
Add edge light:

```css
background:
  linear-gradient(rgba(255,255,255,.52), rgba(255,255,255,.52)) padding-box,
  linear-gradient(120deg,
    rgba(43,220,216,.75),
    rgba(155,140,255,.58),
    rgba(246,129,195,.52)
  ) border-box;
border: 1px solid transparent;
```

Use sparingly:

- Ask
- selected special state
- selected range segment
- current chart marker
- premium CTA

---

## 5.2 Glass Rules

- Glass needs something behind it. Never place transparent glass over an empty flat white field and expect depth.
- Text contrast must remain WCAG compliant.
- Small text should never sit directly over high-color gradients.
- Blur should never be the only separation between layers.
- Every floating surface needs an edge, shadow, or luminance difference.
- Avoid nesting more than 2 glass layers unless the inner layer is visually quiet.

---

# 6. Depth System

Use optical depth, not heavy shadow.

## Shadow Tokens

```css
--shadow-xs: 0 2px 8px rgba(27,38,58,.05);
--shadow-sm: 0 6px 20px rgba(27,38,58,.07);
--shadow-md: 0 14px 36px rgba(27,38,58,.10);
--shadow-lg: 0 24px 64px rgba(20,30,55,.14);
```

## Glow Tokens

```css
--glow-emerald:
  0 0 0 1px rgba(43,220,216,.25),
  0 0 24px rgba(22,184,135,.18);

--glow-violet:
  0 0 0 1px rgba(155,140,255,.28),
  0 0 28px rgba(125,108,255,.20);

--glow-prism:
  0 0 30px rgba(43,220,216,.16),
  0 0 46px rgba(125,108,255,.13);
```

Glow should be soft and diffuse, never neon-sharp.

---

# 7. Radius System

Use fewer, more intentional radii.

```css
--radius-xs: 10px;
--radius-sm: 14px;
--radius-md: 18px;
--radius-lg: 24px;
--radius-xl: 30px;
--radius-pill: 999px;
```

Guidelines:

- row: 14–18
- card: 18–24
- modal: 24–30
- primary CTA: 14–18
- chip/pill: full pill
- icon button: circle or 14–18 square

Avoid 28–32 px radius on every card. It makes the system feel toy-like.

---

# 8. Spacing System

Use a 4px foundation.

```text
4   micro
8   tight
12  compact
16  standard
20  relaxed
24  section interior
32  large
40  major
48  hero
64  page section
```

Mobile horizontal safe padding:

- minimum: 20px
- preferred: 24px

Large data regions may use 16px only if additional visual breathing room exists inside the component.

---

# 9. Typography

## 9.1 Primary UI Typeface

Use a modern grotesk / neo-humanist sans.

Preferred:
- Inter
- SF Pro
- Geist
- Suisse Int'l
- Neue Haas Grotesk

The exact font can change, but the behavior should be:

- highly legible
- neutral
- clean numerals
- good tabular numeral support
- refined at large sizes

---

## 9.2 Display / Financial Numerals

Worthfolio may use a high-end editorial display face **only for major financial numbers** if it remains technically crisp.

Potential:
- Canela
- Tiempos
- Editorial New
- Instrument Serif
- custom serif

Use very sparingly.

If implementation complexity is high, use the primary sans with a lighter weight and carefully tuned tracking.

---

## 9.3 Type Scale

```text
Display XL: 64 / 68, weight 450–500, tracking -0.04em
Display L:  52 / 58, weight 450–500, tracking -0.035em
H1:         36 / 42, weight 600
H2:         28 / 34, weight 600
H3:         22 / 28, weight 600
Body L:     18 / 28, weight 400
Body:       16 / 24, weight 400
Body S:     14 / 20, weight 400
Label:      13 / 18, weight 550
Caption:    12 / 16, weight 500
Micro:      11 / 14, weight 550
```

---

## 9.4 Financial Numerals

Use tabular numerals where numbers align in lists.

```css
font-variant-numeric: tabular-nums;
```

Large hero net-worth numbers can use proportional numerals if aesthetically stronger.

Avoid:
- excessive letter spacing on body text
- ultra-thin text weights
- all-caps longer than 2–3 words

---

# 10. Iconography

## 10.1 Icon Style

Icons are:

- outline first
- 1.5–1.75px stroke at 24px
- slightly rounded
- optically balanced
- minimal geometry
- no heavy fill unless state-dependent

Use small iridescent edge highlights only for:

- AI
- selected
- special insight
- future / forecast

---

## 10.2 Icon Color

Default:
```css
color: var(--slate-700);
```

Active:
- cyan / teal / violet gradient acceptable
- or emerald 600

Do not make every icon gradient.

---

# 11. Button System

## 11.1 Primary

Visual:
- glass body
- emerald–teal–violet gradient
- white label
- inner edge highlight
- soft spectral glow

Sizing:

```text
height: 52px
horizontal padding: 20–24px
radius: 16px
label: 16px / 600
```

Default:
```css
background: linear-gradient(135deg,#16B887 0%,#18C6C5 52%,#7D6CFF 100%);
box-shadow:
  inset 0 1px 0 rgba(255,255,255,.45),
  0 10px 30px rgba(35,161,170,.20),
  0 0 36px rgba(125,108,255,.14);
```

Hover:
- brightness +3%
- translateY(-1px)
- glow +15%

Pressed:
- translateY(0)
- scale(.985)
- reduce shadow

---

## 11.2 Secondary

- quiet glass surface
- dark text
- subtle spectral edge on hover
- no large glow

---

## 11.3 Tertiary

Text or icon only.

---

## 11.4 Destructive

- rose/red low-alpha glass
- red border
- never vivid red fill by default
- high-risk confirmation can use stronger red

---

# 12. Chips & Badges

## Synced
- mint glass
- 8px status dot
- text 13/550
- no glow

## Syncing
- violet/cyan progress spinner
- subtle animated shimmer

## Unsynced / warning
- amber / coral

## Goal
- violet tint

## Estimated
- teal tint

## Projected
- violet / blue tint

---

# 13. Inputs

## 13.1 Default Input

```text
height: 52–56px
radius: 16px
padding: 16px
```

Quiet glass with faint border.

Focus:
- cyan-to-violet ring
- no harsh browser-blue
- subtle outer bloom

```css
box-shadow:
  0 0 0 2px rgba(67,200,255,.70),
  0 0 0 4px rgba(155,140,255,.18),
  0 8px 24px rgba(44,102,180,.08);
```

Invalid:
- rose edge
- low glow
- concise inline message

---

# 14. Segmented Controls

Use as a glass track with clear selected segment.

Track:
- quiet glass
- 48–52px height
- 14–16px radius

Selected:
- Spectral Glass or opaque pearl
- high contrast text
- subtle inner highlight
- small glow only if important

Range selector example:
`1M | 3M | 6M | 1Y | Custom`

Do not make every segment individually boxed.

---

# 15. Navigation

## 15.1 Top Bar

Contains:
- menu
- scenario name
- sync state
- Ask

Should feel light and visually subordinate to data.

Menu:
- 44–48px circular glass control

Ask:
- stronger visual energy than menu
- spectral/emerald glass
- optional sparkle icon

Top bar should not be a separate giant card.

---

## 15.2 Bottom Navigation

Use when app information architecture requires it.

Preferred:
- floating glass dock
- 5 destinations max
- active destination gets subtle cyan/teal halo
- no filled pill behind each item

Suggested:
- Home
- Accounts
- Forecast
- Scenarios
- More

---

# 16. Card System

## 16.1 Summary Card

Examples:
- Assets
- Liabilities
- Goal
- Cash

Structure:
- label
- primary value
- optional metadata
- optional icon / sparkline

Size:
- 144–170px wide on mobile two-column layout
- 104–124px minimum height

Material:
- Glass 1
- optional soft colored corner wash

---

## 16.2 Account Category Card

Examples:
- Cash
- Retirement
- Investments

Use:

- title row
- edit icon
- account rows
- contribution subrows
- total row
- month selector may float between cards

Avoid giant shadows.

Use 1px separators at `rgba(35,48,68,.10)`.

---

# 17. List Rows

Row heights:

- account primary: 56–64px
- secondary metadata row: 36–44px

Use:
- left label
- right aligned amount
- optional small tint icon
- optional disclosure chevron

Hover on desktop:
- background + 4% white
- spectral edge on left or subtle wash

---

# 18. Chart Design System

The chart is a signature element of Worthfolio.

It should be identifiable even without branding.

---

## 18.1 Chart Philosophy

The chart visualizes:

- realized history
- selected present point
- projected future
- goal state

The design language should make those states materially distinct without forcing the user to read a legend.

---

## 18.2 Historical Line

Default:
- emerald → teal gradient
- 2.25–2.75px
- smooth but not artificially rounded
- preserves true data shape

Example:
```css
stroke: url(#historicalGradient);
stroke-width: 2.5;
stroke-linecap: round;
stroke-linejoin: round;
```

Optional soft glow:
- 6–10px blur
- 8–12% opacity

---

## 18.3 Projected Line

Default:
- violet / cool blue
- lower opacity
- dotted or dashed

Preferred dot rhythm:
```text
2px dot / 7px gap
```

Future path should feel:
- lighter
- more speculative
- still precise

---

## 18.4 Current / Selected Point

This is a major brand detail.

Structure:

1. inner core: cyan/blue or emerald
2. white glass ring
3. spectral outer halo
4. optional pulse on selection

Dimensions:
```text
core: 8px
ring: 18px
halo: 34–44px
```

Do not permanently animate the halo.

On new selection:
- halo expands 1.0 → 1.18
- opacity .6 → 0
- 420ms

---

## 18.5 Data Anchors

Maximum visible monthly anchor points at once: **6** for close-range monthly displays.

### Past months
- filled small nodes
- can use emerald or spectral / brass-inspired warm accent if desired
- 6–8px

### Selected month
- selected optical node

### Future months
- hollow / glass rings
- same outer geometry as past marker
- 40–60% opacity

This preserves the earlier “past realized / future open” conceptual logic without relying on stone/brass skeuomorphism.

---

## 18.6 Goal Line

Goal line:
- 1px
- cool slate / violet
- optional spectral shimmer only when goal changes

Goal label:
`Goal $1.00M · ~18 months`

Prefer:
- floating at line edge
- 12–13px
- Glass 0 label
- no heavy capsule unless collision requires it

---

## 18.7 Grid

Grid should be optional by range.

Use:
```css
rgba(71,85,105,.08)
```

Vertical grid may be slightly more visible than horizontal to communicate time cadence.

Avoid full spreadsheet appearance.

---

## 18.8 Area Fill

Optional.

Historical fill:
- teal fade to transparent
- maximum 10–14% opacity

Projected area should usually remain unfilled.

---

## 18.9 Chart Interaction

Dragging / scrubbing:

- selected node follows finger
- tooltip/label should be glass
- line does not re-layout
- haptic tick on month changes if native wrapper supports it

Projected region:
- visually differentiated
- tooltip includes `(est)` / `Projected`

---

# 19. Month / Time Selection

The month selector is a floating control.

Example:
`‹  August 2026  ›`

Material:
- Glass 2
- compact but obvious

Height:
- 52–56px

Width:
- 240–290px depending viewport

Arrows:
- 44px tap targets

Should appear visually integrated with surrounding account cards, not as a random floating slab.

---

# 20. Modal System

## 20.1 Modal Backdrop

Use:
```css
background: rgba(35,48,68,.16);
backdrop-filter: blur(18px) saturate(115%);
```

Add an optional cool mint or lavender atmosphere behind the modal.

---

## 20.2 Modal Panel

Material:
- Glass 2 or Glass 3
- radius 26–30px
- 20–24px padding
- max mobile width = viewport - 24px

Header:
- title
- close control
- optional subtitle

Footer:
- sticky within modal if long
- elevated glass band
- no opaque white wall

---

# 21. Edit Category Modal

Content:

- Edit Category
- Name
- Type: Asset / Liability
- Contributing monthly
- Accounts list
- Delete category
- Save changes

Implementation:

- panel = Glass 2
- selected segment = quiet cyan/emerald spectrum
- account list = nested Glass 1
- save = primary spectral button
- delete = destructive quiet glass

Backdrop should tint the underlying home screen slightly cooler so modal has visual separation.

---

# 22. Ask Worthfolio

Ask Worthfolio is the most magical surface in the product.

It should feel intelligent without appearing like a generic chatbot.

---

## 22.1 Ask Trigger

Button:
- sparkle icon
- “Ask”
- emerald → teal → violet
- soft spectral glow
- slightly more luminous than standard primary actions

---

## 22.2 Ask Panel

Use:
- Glass 3 frame
- strong blur
- quiet iridescent corners
- fixed / docked input

Prompt suggestions should feel like **interactive intelligence cards**, not ordinary list rows.

Use:
- icon
- prompt
- optional disclosure
- quiet glass
- hover = spectral wash

---

## 22.3 Composer

Dock at bottom.

Height:
- 58–64px

Includes:
- prompt input
- send button

Send:
- 44–48px
- spectral gradient
- paper-plane or arrow icon
- slight glow

---

# 23. Scenario Drawer

Use an off-canvas glass sheet.

Width:
- 82–88vw mobile
- max 390px

Backdrop:
- blur underlying content
- slight parallax offset

Selected scenario:
- Glass 2 highlight
- subtle left spectral edge
- no giant filled card

Scenario row:
- title
- trailing ellipsis
- 52–60px

Profile row anchored near bottom.

---

# 24. Locked Screen

The locked screen must feel secure, modern, and calm.

Avoid:
- generic login form
- archaic vault imagery
- aggressive security iconography

Use:

- large ambient pearl field
- central Glass 2 card
- small W mark
- LOCKED micro-label
- password input
- Unlock
- recovery phrase
- sign out

Focus ring should be spectral blue-violet.

Unlock disabled:
- low contrast glass
- no misleading glow

Unlocked transition:
- card blur decreases slightly
- content fades
- home screen resolves behind it

---

# 25. Feedback States

## Success
- emerald/cyan
- soft check ring
- no full green panel unless important

## Warning
- amber/coral
- 10–14% tint

## Error
- rose/red
- concise
- never shake violently

## Loading
Use:

- skeleton blur
- soft shimmer
- low-chroma holographic sweep

Avoid traditional spinning loaders unless operation has no known shape.

---

# 26. Skeleton Loading

Skeleton surface:

```css
background:
  linear-gradient(
    100deg,
    rgba(255,255,255,.24) 20%,
    rgba(255,255,255,.62) 38%,
    rgba(255,255,255,.24) 56%
  );
background-size: 220% 100%;
animation: shimmer 1.6s ease-in-out infinite;
```

Optional slight cyan/violet spectrum in shimmer at <5% opacity.

---

# 27. Motion System

Motion should feel:

- fluid
- frictionless
- exact
- optically responsive
- intelligent
- never bouncy

---

## 27.1 Durations

```text
instant micro: 100–140ms
tap / hover:   140–180ms
component:     180–240ms
panel:         260–340ms
modal:         320–420ms
hero reveal:   500–700ms
```

---

## 27.2 Easing

Primary:
```css
cubic-bezier(.22,1,.36,1)
```

Standard:
```css
cubic-bezier(.2,.8,.2,1)
```

Avoid:
- overshoot
- bounce
- elastic spring for financial UI

Native spring may be used only with high damping.

---

## 27.3 Hover

Desktop/web:

- translateY(-1px)
- edge luminance +8–12%
- shadow +5–10%
- no dramatic scale

---

## 27.4 Press

- scale .985
- reduce glow
- shift down 0–1px
- 100–140ms

---

## 27.5 Modal Open

Sequence:

1. backdrop blur 0 → 18px
2. backdrop tint fades in
3. modal opacity 0 → 1
4. modal translateY 10px → 0
5. spectral edge glow settles last

Total ~340ms.

---

## 27.6 Drawer

- sheet translates
- underlying content translates 4–8% viewport and subtly scales .985
- backdrop blur increases
- no rubber-band unless native physics requires it

---

## 27.7 Chart Load

Sequence:

1. grid / labels fade
2. historical line draws left → right
3. past anchors fade in
4. current point blooms
5. projected dotted path appears
6. future nodes resolve
7. goal line fades

Total: 650–900ms only on first meaningful reveal.

On normal navigation, use 240–360ms reduced version.

---

# 28. Reduced Motion

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

When enabled:

- remove line drawing
- remove bloom pulses
- remove parallax
- use opacity only
- keep duration <150ms where possible

---

# 29. Accessibility

## Contrast

All text must meet:

- normal text: 4.5:1
- large text: 3:1

Do not rely on glass blur for contrast.

If background shifts, add subtle local surface or text shadow.

---

## Focus

Keyboard focus:
- 2px cyan / violet ring
- 2px offset
- visible against all surfaces

---

## Touch

Minimum target:
- 44×44px

Preferred:
- 48×48px

---

## Color Independence

Historical vs projected:
- color + line style
- not color alone

Asset vs liability:
- label + color

Synced:
- text + dot

---

# 30. Responsive Behavior

## Mobile
Primary target.

- single column
- 20–24px padding
- summary cards can be 2-column
- charts full width

## Tablet
- 32px page gutters
- summary cards can be 4-column
- account content max width 760–900px

## Desktop
Use centered application shell.

Recommended:
```text
max-width: 1280px
content-width: 920–1120px
```

Do not simply stretch mobile UI.

Desktop can show:
- sidebar
- persistent scenario switcher
- larger chart
- two-column account/category layouts

---

# 31. Home Screen Specification

Recommended order:

1. status / nav
2. net worth hero
3. monthly change
4. chart
5. range selector
6. assets / liabilities
7. month navigator
8. category cards
9. optional bottom nav

---

## 31.1 Home Hero

Do not wrap net worth in a giant card.

Let it breathe on the atmospheric background.

Net worth:
- 52–64px
- dark navy/slate
- tabular or elegant display numeral

Monthly change:
- emerald
- optional `(est)`
- info icon

---

## 31.2 Home Chart

Use signature Holographic Calm chart.

Selected month should have the strongest local spectral energy on the entire home screen.

The chart should feel integrated into the background, not inside a generic card.

---

# 32. Surfaces Matrix

| Surface | Material | Use |
|---|---|---|
| Page | atmosphere | app background |
| Summary | Glass 1 | assets/liabilities |
| Account card | Glass 1 | category group |
| Floating selector | Glass 2 | month selector |
| Modal | Glass 2/3 | edit flows |
| Ask panel | Glass 3 | AI |
| Drawer | Glass 2 | scenarios |
| Toast | Glass 2 | feedback |

---

# 33. Data Visualization Color Rules

Historical:
- emerald → teal

Projected:
- blue → violet

Goal:
- slate / violet

Positive delta:
- emerald

Negative delta:
- muted rose

Liability:
- rose/coral

Neutral:
- slate

Do not introduce unique colors per account category unless necessary.

---

# 34. Microcopy Tone

Tone:
- concise
- calm
- confident
- direct

Good:
- “Synced”
- “Projected”
- “Estimated”
- “Goal”
- “Save changes”
- “Ask about your forecast…”

Avoid:
- hype
- “Crush your goals!”
- “You’re killing it!”
- motivational finance clichés

---

# 35. Logo Usage

The W can be used:

- flat
- glass-framed
- spectral edge highlight
- white/ivory or dark ink

Do not make the logo permanently holographic.

The wordmark should remain calm and stable while product surfaces carry more optical energy.

This contrast creates sophistication.

---

# 36. Dark Mode

Dark mode is optional, not default.

If built:

Base:
```css
--dark-bg: #07111C;
--dark-surface: rgba(18,30,44,.58);
```

Use:
- emerald/cyan/violet light
- fewer bright white surfaces
- no crushed blacks

Dark mode should feel like “Midnight Prism,” but maintain the same component geometry.

---

# 37. Implementation Guidance

## 37.1 Prefer CSS for Most Effects

Use:

- `backdrop-filter`
- alpha backgrounds
- pseudo-element gradient edges
- `filter: blur()`
- layered box shadows
- SVG gradients for charts

Avoid raster images for:
- card backgrounds
- glows
- borders
- UI gradients

---

## 37.2 Glass Border Technique

```css
.glass-spectral {
  position: relative;
  background: rgba(255,255,255,.50);
  backdrop-filter: blur(24px) saturate(130%);
  border-radius: 22px;
}

.glass-spectral::before {
  content: "";
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  background: linear-gradient(
    120deg,
    rgba(43,220,216,.65),
    rgba(255,255,255,.85),
    rgba(155,140,255,.58),
    rgba(246,129,195,.45)
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

---

## 37.3 Performance

Blur is expensive.

Rules:

- avoid >30px blur on many simultaneous full-screen layers
- avoid animated backdrop blur
- animate opacity/transform instead
- cache chart glow layers
- use `will-change` sparingly
- simplify effects on low-power devices

---

# 38. WebGL Usage

WebGL is **not required** for the core product UI.

Use WebGL only for:

- landing page hero
- ambient light field
- subtle interactive prismatic material
- non-essential decorative depth

Do not use WebGL for:
- buttons
- forms
- charts
- standard navigation

Product UI must remain accessible and performant without GPU-heavy rendering.

---

# 39. Landing Page Visual Translation

The landing page should use the same visual system but can be more cinematic.

Hero:
- pearl atmosphere
- floating glass product preview
- large spectral light field
- optional WebGL interactive refraction
- cursor influences light position, not object position

Headline:
- minimal
- calm
- large

Potential:
> Know your worth. See where you’re headed.

The landing page should not become a completely different art direction.

---

# 40. Do / Don’t

## Do

- use glass selectively
- create depth with optics
- let color behave like light
- preserve whitespace
- make charts signature
- keep type crisp
- reserve spectral glow for active states
- use animation to clarify change
- keep controls tactile and precise

## Don’t

- put gradients on every component
- use neon text
- blur large bodies of text
- make all cards equally translucent
- use giant glowing shadows
- imitate crypto dashboards
- overuse violet/pink
- use “glassmorphism” without hierarchy
- make finance data hard to read
- turn every hover into a light show

---

# 41. QA Acceptance Criteria

A screen passes visual QA only if:

### Hierarchy
- primary number is immediately obvious
- active action is clear
- projected data is distinct from historical
- visual depth has at least 3 perceptible levels

### Material
- glass reads as translucent rather than gray
- edge highlights are subtle
- no panel appears muddy

### Color
- no more than 2 strong spectral accents compete
- emerald is consistent for positive state
- liability uses restrained rose

### Typography
- all financial numbers align properly
- large numbers do not wrap
- labels remain legible against glows

### Motion
- no bounce
- no distracting continuous animation
- reduced motion works

### Accessibility
- tap targets >=44px
- keyboard focus visible
- color is not sole semantic cue
- text passes contrast

### Performance
- 60fps target on modern mobile devices
- first meaningful screen usable before decorative effects finish
- no blocking WebGL for app core

---

# 42. Component Inventory

The production design system should include:

### Brand
- W mark
- wordmark
- app icon

### Buttons
- primary
- secondary
- tertiary
- danger
- icon
- Ask / AI

### States
- default
- hover
- pressed
- focus
- disabled
- loading

### Inputs
- text
- search
- password
- number
- currency
- select
- dropdown
- slider

### Controls
- checkbox
- radio
- toggle
- segmented control
- range selector
- month navigator

### Navigation
- top bar
- drawer
- bottom nav
- scenario selector
- breadcrumb desktop

### Data
- summary card
- account row
- category card
- account table
- total row
- delta
- goal card

### Charts
- net worth line
- projected line
- goal line
- selected marker
- past marker
- future marker
- tooltip
- axis
- range controls

### Feedback
- toast
- inline error
- banner
- success
- warning
- error
- skeleton

### Overlays
- modal
- sheet
- drawer
- Ask panel
- confirmation

### Identity
- avatar
- profile row

---

# 43. Suggested Token Structure

```text
color.*
surface.*
gradient.*
shadow.*
glow.*
radius.*
space.*
type.*
motion.*
chart.*
z.*
```

Example:

```json
{
  "color": {
    "bg": "#F8FAFF",
    "ink": "#101828",
    "emerald": "#16B887",
    "cyan": "#1FAFFF",
    "violet": "#7D6CFF",
    "rose": "#F681C3"
  },
  "radius": {
    "sm": 14,
    "md": 18,
    "lg": 24,
    "xl": 30
  },
  "motion": {
    "fast": 160,
    "base": 220,
    "panel": 320
  }
}
```

---

# 44. Final Art Direction Statement

Worthfolio should feel like a **private wealth operating system from the near future**.

The experience is bright rather than dark, intelligent rather than flashy, translucent rather than flat, and vibrant without becoming loud.

Every screen should communicate:

- clarity
- control
- privacy
- trajectory
- intelligence
- optimism

The aesthetic should not depend on any single effect. The quality comes from the system working together:

**typography + spacing + glass + light + gradients + blur + precise motion + disciplined data visualization.**

If all effects are removed, the product should still be beautifully designed.

If the effects are added back, it should become unmistakably Worthfolio.

---

# 45. One-Sentence Build Brief

> Build Worthfolio as a light-mode, glass-forward, holographic financial operating system using pearl atmospheres, layered translucency, emerald/cyan/violet spectral light, precise typography, signature luminous charts, restrained blur, and smooth non-bouncy motion — premium, futuristic, private, and calm.
