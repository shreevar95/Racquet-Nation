# Handoff: Racquet Nation — Fantasy Racquet-Sports Platform

## Overview
Racquet Nation is a **fantasy sports platform** for racquet sports (pickleball, tennis, badminton, squash, table tennis, padel) — think Fantasy Premier League, but for local racquet leagues. Managers draft a squad, submit **sealed lineups** each gameweek, score points live as matches finish, and climb mini-league tables.

This package covers the **whole product front end**:
1. **Marketing site** (`marketing_site.dc.html`) — public, logged-out site: hero, stats band, how-to-play, mini-league leaderboard, player cards, live-scoring section, sports, CTA, footer.
2. **Player app** (`app_prototype.dc.html`) — logged-in, mobile-first: dashboard, Matches/Standings/Teams tabs, the sealed-lineup submission flow, match detail, plus a responsive desktop layout.

Target codebase: the existing **Next.js (App Router)** app in the `Racquet-Nation` repo (shadcn/ui + Tailwind). Implement using that environment's components and conventions.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behaviour, **not production code to copy directly**. Recreate them in React/Tailwind/shadcn, mapping to the codebase's tokens and components.
- `marketing_site.dc.html` — marketing site.
- `app_prototype.dc.html` — player app (interactive: tab switching, lineup assignment via bottom sheet, lock-in, navigation; read the `class Component` block at the bottom for state/logic).
- `support.js` — **prototyping runtime only. Do NOT port it.**

Both files now share **one unified visual system** (see tokens). The marketing site is the canonical reference for visual language; the app is the canonical reference for screens, flows and copy.

## Fidelity
**High-fidelity.** Final colors, type, spacing, motion, and interactions are specified. Gray boxes labelled `[ ... photo/screenshot ]` mark slots for real imagery — reproduce their dimensions/radius and drop the asset in.

---

## DESIGN TOKENS (unified)

### Color
```
/* Brand — saffron (primary) */
--saffron:        #F26B21;   /* primary actions, headers, accents, active state */
--saffron-300:    #FF9A5A;   /* gradient partner / hovers */
--saffron-tint:   #FFF1E7;   /* highlighted rows, soft fills */

/* India green (secondary — success / opponent / "up") */
--green:          #19A463;
--green-300:      #34D77E;
--green-soft:     #7BE6A6;   /* on dark green sections */

/* Navy ink (text + dark surfaces) */
--ink:            #13243A;   /* primary text */
--ink-deep:       #0E1B2A;   /* hero/footer/phone-bezel dark surface */
--navy-card:      #13243A;   /* dark cards on hero */

/* Support */
--yellow:         #F4C24B;   /* highlight / 2nd-place / amber accents */
--blue:           #3E9BD8;   /* tertiary data accent */
--red-down:       #E0533B;   /* rank "down" arrows */

/* Neutrals / surfaces */
--paper:          #F4F1EA;   /* page background (warm off-white) */
--sand:           #E9E1D4;   /* alt band behind cards */
--card:           #ffffff;   /* cards */
--text-secondary: #54637a;
--text-muted:     #8493a6;
--border:         #E7E2D8;   /* warm hairline */
```
Brand is **saffron-forward and energetic** (fantasy-app feel), grounded by navy and warm paper, with green/yellow/blue as data accents. Dark sections use deep navy (`#0E1B2A`) or a green "pitch" radial (`#0E7C4B → #0A2A1C`).

### Typography
- **Display/headlines:** **Nunito** weight **900**, UPPERCASE, `letter-spacing:-.03em`, line-height ~.94–1.0. (Rounded, heavy, sporty. NOT italic, NOT a sharp grotesk — this was deliberately chosen over Archivo/Hanken.)
- **Body & UI:** Nunito 400–800.
- **Big numbers** (points, ranks): Nunito 900.
```
Hero H1:        74px / 900 / -.03em / uppercase
Section H2:     44–58px / 900 / -.03em / uppercase
Card H3:        21px / 800
Eyebrow:        13px / 800 / .18em / uppercase  (section accent color)
Body:           15–19px / 400–700 / line-height 1.55–1.6
Big metric:     42–62px / 900
Nav links:      14px / 700
```
**Gradient accent word** — one phrase per headline filled with a gradient in the section accent:
```css
background: linear-gradient(90deg, <c1>, <c2>);
-webkit-background-clip: text; background-clip: text;
-webkit-text-fill-color: transparent;
```
(In React use a CSS class or a clean style object with `WebkitBackgroundClip`/`WebkitTextFillColor`. ⚠️ Do not append extra inline properties to a malformed style string — keep these four declarations intact.)
Pairs: saffron `#F26B21→#FF9A5A`, green `#19A463→#34D77E`, green-soft `#7BE6A6→#34D77E`.

### Radius
```
pills/chips:   99px / 14px
cards:         20–24px
inner cards:   13–16px
icon tiles:    9–16px
phone screen:  34px (bezel 42px)
```

### Shadow
```
card:        0 12px 34px rgba(16,28,44,.08)
card-hover:  0 22px 48px rgba(16,28,44,.18)
floating:    0 26px 60px rgba(16,28,44,.32)  /* light cards on dark */
brand-glow:  0 10px 26px rgba(242,107,33,.38) /* saffron buttons */
phone:       0 36px 80px rgba(0,0,0,.5)
```

### Spacing / layout
- Content max-width **1160px**; gutters 28px. Section vertical padding 60–90px.
- Nav: sticky, height ~60px, translucent paper blur (`rgba(244,241,234,.82)`, `backdrop-filter: blur(18px)`), 1px bottom border `rgba(16,28,44,.07)`.

### Motion
- **Reveal on load** (`rnReveal`): `@keyframes { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:none } }`, `.7s cubic-bezier(.2,.7,.2,1)` with `both` fill.
  - ⚠️ Implementation: prefer scroll-triggered (IntersectionObserver). Keep the **resting state visible** so content can never be stuck hidden if the trigger doesn't fire.
- **Float** (hero cards): gentle `translateY` loops (±10–16px, 5.5–7s), some with a few degrees of rotation, staggered.
- **Card hover lift:** `transform: translateY(-5px)` + deeper shadow, `.25s cubic-bezier(.2,.7,.2,1)`.
- **Button hover:** `translateY(-2px)` + `brightness(1.04)`.
- Respect `prefers-reduced-motion: reduce` → disable entrance/float/hover-lift, show final state.

---

## MARKETING SITE — Sections (top to bottom)

1. **Nav** — RN gradient logo tile + wordmark; links (Leagues, Fixtures, How to play, Sign in); gradient **"Join free"** pill.
2. **Hero** (deep navy radial, glow blobs) — live pill "● GAMEWEEK 7 IS LIVE"; H1 "Pick your squad. **Rule the league.**" (saffron gradient on the last line); subhead; two buttons ("Create your team →" saffron, "How to play" ghost); manager avatars + count. Right: a **floating card cluster** (all animate/float): a saffron **gameweek-points** card (big "82", "▲12 vs avg"), a white **mini-league** card (ranked rows + "▲2"), a navy **next-fixture** card (Smashers VS Net Ninjas).
3. **Stats band** (saffron gradient): 4.8k managers · 1.2k mini-leagues · 120+ tournaments · 6 sports.
4. **How to play** — eyebrow + H2 "Three steps to **game day**"; 3 white hover-lift cards with gradient numbered tiles (saffron / green / blue): Draft your squad · Submit sealed lineup · Score & climb.
5. **Mini-leagues** — left: copy + green "Start a league →" button; right: a leaderboard card (GW7, 24 teams) with rank, **green ▲ / red ▼ / gray —** movement, team initial-tiles, "GW xx" and total points; user's row highlighted saffron-tint.
6. **Your players** — H2 "Every point counts"; 4 fantasy **player cards** (hover-lift): colored gradient top (saffron/blue/green/yellow) with position badge + avatar, white info plate overlapping with name, team, and big colored points.
7. **Live scoring** (green "pitch" radial + center circle motif) — eyebrow + H2 "Feel every **point land.**"; 3 green check feature lines; right: floating **phone** showing GAMEWEEK 7 · LIVE, big "82 ▲12 pts", and live player point rows (+24 captain, +11 live, +8).
8. **Sports** — H2 "Six sports to manage"; pill row (with sport emoji on first three).
9. **Final CTA** — full saffron-gradient rounded panel: "Gameweek 7 is live. Don't miss out." + white "Create your team →" button.
10. **Footer** — deep navy: logo + blurb, columns (Play / Sports / Company), copyright.

---

## PLAYER APP — Screens / Views

### A. Dashboard
- Saffron header (welcome + avatar) with curved bottom.
- **Next-match card** (overlaps header): "YOUR NEXT MATCH" + time; Smashers VS Net Ninjas initial-tiles; "Court 2 · Summer League · Group B"; saffron **"Submit your lineup →"** → Lineup flow. (Card tappable.)
- **Stat row:** RECORD 7–2 · GROUP RANK #3 (saffron-tint) · STREAK W4.
- **Segmented tabs:** Matches / Standings / Teams (active = white + shadow).
  - *Matches:* rows — colored accent bar + title + meta + status ("LINEUP →" saffron when action needed, else muted). Tap → Match detail.
  - *Standings:* card table — rank, team tile, name, points; user's team row highlighted.
  - *Teams:* rows — tile, name, sub, "Manage →".
- **Bottom nav** (4): Home / Play / Matches / You; active = filled saffron tile.

### B. Lineup flow (the differentiator — sealed lineups)
- Header: "← Back", "SUBMIT LINEUP · SAT 4:00 PM", "Smashers VS Net Ninjas".
- **Editing:** "ASSIGN YOUR POSITIONS" + 4 slot rows (Singles 1, Singles 2, Doubles · A, Doubles · B). Tapping a slot opens the **player-picker bottom sheet** (roster; already-assigned players disabled/dimmed). "Lock in lineup" disabled until all 4 set, then saffron + enabled. Caption "N of 4 positions set".
- **Locked/sealed:** centered card — 🔒 tile, "Lineup sealed", explanation that both captains reveal together, a summary of the 4 picks, and an "Edit lineup" link.

### C. Match detail
- Both teams (tiles + VS); rows for When / Where; a "Lineup not submitted / Sealed reveal when both lock in" callout with "Submit →" → Lineup flow.

### D. Desktop layout
- Top bar (wordmark + nav + avatar) over saffron header; two columns: left = next-match card + UPCOMING MATCHES; right = stat tiles + GROUP B STANDINGS + MY TEAMS.

### App state (for implementation)
```
screen:  'dashboard' | 'lineup' | 'match'
tab:     'matches' | 'standings' | 'teams'
nav:     'home' | 'tournaments' | 'matches' | 'profile'
picking: slot key being assigned, or null  (opens picker sheet)
lineup:  { S1, S2, D1, D2 } → player name or null
locked:  boolean  (sealed confirmation vs editing)
```
- Lock enabled only when all 4 slots filled.
- Roster players already used in another slot are disabled in the picker.

---

## Assets
- Imagery is **placeholder slots** (gray `[ ... ]` boxes): hero is a floating-card cluster (no photo needed) — but the live-scoring/phone and bracket areas can take real screenshots. Replace at same dimensions/radius.
- Team marks are **initials in rounded tiles** (SM, NN, AC…) — replace with real crests later if desired.
- Icons: lock glyph, chevrons (›, →), rank arrows (▲ ▼ —). Use the codebase's icon set; the sport-pill emoji can be swapped for icons.
- Fonts: **Nunito** (Google Fonts) weights 400–900. No other display face — Nunito 900 is the headline font by design.

## Files
- `marketing_site.dc.html` — marketing site reference.
- `app_prototype.dc.html` — player app reference (template + `class Component` logic).
- `support.js` — prototyping runtime only; **do not port.**
