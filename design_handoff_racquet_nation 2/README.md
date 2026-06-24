# Handoff: Racquet Nation — Fantasy Marketing Site + Player App

## Overview
Racquet Nation is a **fantasy racquet-sports platform** — pick your squad, submit sealed lineups, run mini-leagues, and climb the table every gameweek across six sports (pickleball, tennis, badminton, squash, table tennis, padel). Think "Fantasy Premier League, for racquet sports."

This package covers the front end:
1. **Marketing site** (`marketing_site.dc.html`) — the public, logged-out website.
2. **Player app** (`app_prototype.dc.html`) — the logged-in mobile-first experience + a responsive desktop layout.

Target codebase: the existing **Next.js (App Router)** app in the `Racquet-Nation` repo (shadcn/ui + Tailwind, Clerk auth, Prisma). Implement using that stack's conventions.

## About the Design Files
These `.dc.html` files are **design references** — built in a lightweight prototyping tool, showing intended look + behaviour. They are **not production code**.
- `support.js` — the prototyping runtime. **Ignore it. Do not port it.**
- The `.dc.html` files use inline styles + a small template syntax (`{{ }}` holes, `<sc-for>` loops, and a `class Component` logic block at the very bottom for data/state). **Read them for exact values and structure, then recreate the UI in React/Tailwind/shadcn**, mapping styles to tokens.

**Both files use ONE unified palette and type system** (documented below) — the marketing site and app already match. No re-skin needed.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, shadows, and interactions are specified. Recreate accurately using the codebase's libraries. The team marks are **initials in rounded squares** (SM, NN, AC…) — no logo assets needed.

---

## DESIGN TOKENS (canonical — shared by both files)

### Color
```
/* Brand neutrals */
--paper:      #F4F1EA;   /* warm off-white page background (NOT pure white) */
--ink:        #13243A;   /* primary text + deep navy surfaces */
--navy-2:     #0E1B2A;   /* darkest navy (footer, phone bezel, hero base) */
--card:       #ffffff;   /* cards sit on --paper */
--sand:       #F7F5F0;   /* zebra row / subtle fill */
--cream:      #FFF1E7;   /* highlighted ("your team") row + tinted stat tile */
--border:     #E7E2D8;   /* hairline on cards */

/* Saffron — PRIMARY accent (India-flag inspired) */
--saffron:     #F26B21;
--saffron-300: #FF9A5A;   /* gradient partner */
--saffron-700: #D2541A;   /* gradient deep end */
/* primary gradient: linear-gradient(135deg, #F26B21, #FF9A5A) */

/* India green — SECONDARY (success, "up", live scoring) */
--green:      #19A463;
--green-700:  #0E7C4B;
--green-300:  #34D77E;
--green-200:  #7BE6A6;   /* on dark pitch */

/* Support accents */
--blue:       #3E9BD8;   --blue-700: #2A6FB0;
--gold:       #F4C24B;   --gold-700: #C6952A;
--red-down:   #E0533B;   /* "down" rank movement */

/* Text tiers (on paper/white) */
--text-2:     #54637a;   /* body / secondary */
--text-3:     #8493a6;   /* meta / muted */
/* On dark navy hero: body #aebfd0, meta #9fb1c4 */
/* On dark green pitch: body #bfe3cd / #eaf6ee, eyebrow #7BE6A6 */
```
The page background is **warm paper `#F4F1EA`, never pure white**. White is for cards only. Color is used boldly (this is a sports/fantasy product, not a minimal SaaS page): orange gradients, a dark navy hero, a dark green "pitch" section, colorful player cards.

### Typography
**One family: Nunito** (rounded, friendly), weights 400–900. Load via `next/font/google` (already added to the repo as `--font-nunito`).
```
Hero H1:      74px / 900 / line-height .94 / -.03em / UPPERCASE
Section H2:   44–58px / 900 / -.03em / UPPERCASE   (per section; CTA 58, how-to 50)
Card H3:      21px / 800
Eyebrow:      13px / 800 / letter-spacing .18em / UPPERCASE  (color = section accent)
Body:         15–19px / 400–600 / line-height 1.55–1.6
Big metric:   42–62px / 900 / -.0–.03em   (e.g. "82" gameweek points)
Pill / chip:  16px / 800
Nav link:     14px / 700
```
**Gradient accent word** — each headline has ONE phrase filled with a gradient (use `background:<grad>; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;`). Pairs: saffron `#F26B21→#FF9A5A`, green `#19A463→#34D77E` / `#7BE6A6→#34D77E`.

### Radius
```
pill:99px   card:22px   inner card:13–14px   tile/badge:9–16px
phone screen:34px   phone bezel:42px
```

### Shadow
```
card:        0 12px 34px rgba(16,28,44,.08)
card-hover:  0 22px 48px rgba(16,28,44,.18)   (lift on hover)
leaderboard: 0 18px 44px rgba(16,28,44,.12)
brand glow:  0 10px 26px rgba(242,107,33,.38)  (orange buttons)
floating:    0 26px 60px rgba(16,28,44,.32)    (hero cards)
phone:       0 36px 80px rgba(0,0,0,.5)
```

### Layout
- Content max-width **1160px**, horizontal gutter **28px**.
- Section vertical padding **50–90px**.
- Nav: sticky, height ~60px, translucent paper: `background:rgba(244,241,234,.82); backdrop-filter:saturate(180%) blur(18px);` hairline bottom border.

### Motion (all respect `prefers-reduced-motion`)
```css
@keyframes rnReveal { from {opacity:0; transform:translateY(28px)} to {opacity:1; transform:none} }  /* .rev — .7s cubic-bezier(.2,.7,.2,1) both */
@keyframes floatA/B/C { gentle ±10–16px vertical bob, 5.5–7s infinite }  /* hero floating cards + phone */
.card:hover { transform:translateY(-5px); box-shadow:card-hover }       /* .25s */
.ctabtn:hover { transform:translateY(-2px); filter:brightness(1.04) }
.lnk:hover { color:#F26B21 }
```
> ⚠️ Reveal note: keep the **resting state visible** (`.rev` animates *in* but its end state is opacity:1). In React, prefer triggering reveals on scroll-into-view (IntersectionObserver) and never leave content stuck at opacity:0 if JS doesn't fire.

---

## MARKETING SITE — Sections (top → bottom, exactly as in `marketing_site.dc.html`)

> Page wrapper background `#F4F1EA`. Build in this order.

### 1. Nav (sticky, translucent paper)
Logo: gradient-orange rounded square "RN" + "Racquet Nation" (800). Links: Leagues, Fixtures, How to play, Sign in. Primary button "Join free" (orange gradient + glow).

### 2. Hero — DARK (radial navy `#1B3A57 → #0E1B2A`), two-column
- **Left copy:** live pill ("● GAMEWEEK 7 IS LIVE", green dot), H1 74px UPPERCASE "Pick your / squad. / **Rule the league.**" (last line orange gradient), subhead (`#aebfd0`), two buttons (orange "Create your team →" + glass "How to play"), avatar stack + "4,800+ managers competing this week".
- **Right — floating card cluster** (3 cards, gentle float animation):
  - **Gameweek points** (orange gradient): "GAMEWEEK POINTS" / big "82" / "▲ 12 vs avg".
  - **Mini-league** (white): "OFFICE LEAGUE" + 3 ranked rows (Net Ninjas 641, Aces 628, **Smashers 615** highlighted cream row) — rank, team initial-tile, name, points.
  - **Next fixture** (navy `#13243A`): "NEXT FIXTURE / SAT 4PM", Smashers VS Net Ninjas with initial-tiles.
- Soft orange + green radial glows bleed from the corners.

### 3. Stats band (full-bleed orange gradient `#F26B21 → #FF9A5A`)
4 columns, white numbers: 4.8k MANAGERS · 1.2k MINI-LEAGUES · 120+ TOURNAMENTS · 6 SPORTS.

### 4. How to play (on paper, 3 white cards, hover-lift)
Eyebrow "HOW TO PLAY" (saffron). H2 "Three steps to **game day**" (orange gradient word). Cards, each with a gradient numbered badge (1 orange / 2 green / 3 blue): **Draft your squad** · **Submit sealed lineup** · **Score & climb**.

### 5. Mini-league leaderboard (on paper, two-column)
- Left: eyebrow "MINI-LEAGUES" (green), H2 "Bragging rights, **settled.**" (green gradient word), body, green button "Start a league →".
- Right: white leaderboard card "Office League · GW7 / 24 teams" with 5 rows. **Each row:** rank, movement chip (▲ green / ▼ red / — gray), team initial-tile, name, "GW {n}" subtotal, bold total. The user's row ("Smashers") highlighted cream; others zebra-striped. *(Data is in the logic block's `leaderboard` array.)*

### 6. Player cards (on paper, 4-up grid, hover-lift)
Eyebrow "YOUR PLAYERS" (saffron). H2 "Every point counts". 4 cards: colored gradient header (with position badge + avatar slot) and an overlapping white info chip — player name, team, big colored points + "PTS". *(Data in logic block's `players` array.)*

### 7. Live scoring — DARK (radial green pitch `#0E7C4B → #0A2A1C`, faint center-circle line), two-column
- Left: eyebrow "LIVE SCORING" (`#7BE6A6`), H2 "Feel every / **point land.**" (green gradient word), body (`#bfe3cd`), 3 green-check feature lines.
- Right: **phone mock** (navy bezel) — orange gradient header "GAMEWEEK 7 · LIVE" + big "82 / ▲ 12 pts", then 3 live player rows (initial-tile, name + status like "Singles 1 · won 2–0", colored points like +24).

### 8. Sports (on paper, centered)
Eyebrow "ONE APP" (saffron). H2 "Six sports to manage". Row of 6 white pill-cards (hover-lift): 🏓 Pickleball, 🎾 Tennis, 🏸 Badminton, Squash, Table Tennis, Padel.

### 9. Final CTA (orange radial-gradient rounded panel `#FF9A5A→#F26B21→#D2541A`)
H2 58px UPPERCASE white "Gameweek 7 is live. / Don't miss out." + subhead + white "Create your team →" button. Decorative translucent circles.

### 10. Footer — DARK navy `#0E1B2A`
4 columns: brand blurb + Play / Sports / Company link lists. Bottom row: "© 2026 Racquet Nation" · "Made for managers, by players."

---

## PLAYER APP — Screens (`app_prototype.dc.html`, same palette)
Mobile-first; also a desktop two-column layout. Interactive prototype — read the `class Component` logic block at the bottom for state + data.

**Screen headers are dark navy gradient** (`#1B3A57 → #0E1B2A`); saffron = primary actions, green = secondary/positive.

### A. Dashboard
Navy header "WELCOME BACK / Arjun" + avatar. **Next-match card** (overlaps header, tappable): "YOUR NEXT MATCH" + time, Smashers VS Net Ninjas (initial-tiles), "Court 2 · Summer League · Group B", saffron "Submit your lineup →" → Lineup flow. **Stat row:** RECORD 7–2 · GROUP RANK #3 (cream tile) · STREAK W4. **Segmented tabs** Matches / Standings / Teams:
- *Matches*: rows — colored accent bar, title, meta, status ("LINEUP →" saffron when action needed, else muted). Tap → Match detail.
- *Standings*: card table — rank (saffron), team tile, name, points; user's row highlighted.
- *Teams*: rows — team tile, name, sub ("Summer League · Captain"), "Manage →".
**Dark bottom nav** (navy): Home / Play / Matches / You; active = filled saffron square + white label.

### B. Lineup flow (the differentiator — "sealed lineups")
Navy header "← Back / SUBMIT LINEUP · SAT 4:00 PM / Smashers VS Net Ninjas".
- **Editing:** "ASSIGN YOUR POSITIONS" + 4 slot rows (Singles 1, Singles 2, Doubles · A, Doubles · B). Tap a slot → **player-picker bottom sheet** (roster; already-picked players disabled/dimmed). Footer "Lock in lineup" is disabled (gray) until all 4 set, then saffron. Caption "N of 4 positions set".
- **Locked/sealed:** centered card — 🔒 cream tile, "Lineup sealed", explanation "…reveal together when Net Ninjas locks in", summary of the 4 picks, "Edit lineup" link (→ editing).

### C. Match detail
Navy header with both teams. Rows: When (Sat · 4:00 PM), Where (Court 2 · Summer League), and a "Lineup not submitted / Sealed reveal when both lock in" callout with saffron "Submit →" → Lineup flow.

### D. Desktop layout
Top bar + navy header "WELCOME BACK / Arjun". Two columns: left = next-match card + "UPCOMING MATCHES"; right = stat tiles + "GROUP B STANDINGS" + "MY TEAMS".

### App state model
```
screen:  'dashboard' | 'lineup' | 'match'
tab:     'matches' | 'standings' | 'teams'
nav:     'home' | 'tournaments' | 'matches' | 'profile'
picking: slot key being assigned, or null   (opens picker sheet)
lineup:  { S1, S2, D1, D2 } → player name | null
locked:  boolean                            (sealed vs editing)
```
Lock enabled only when all 4 slots filled; roster players already used elsewhere are disabled in the picker.

---

## Suggested build order (sandbox first)
Build the marketing site on a throwaway route `/preview` (isolated from existing layout/auth), review section by section, then promote to the real public route. Commit after each section.

1. Tokens (done) → 2. Nav + dark hero w/ floating cards → 3. Stats band → 4. How to play → 5. Mini-league leaderboard → 6. Player cards → 7. Live-scoring dark pitch + phone → 8. Sports pills → 9. Final CTA → 10. Footer. Then the app screens (A–D), reusing existing repo components/data where they exist.

## Assets
- No photography in this design — it's illustrative cards, gradients, and initial-tiles. (Optional: real player photos could drop into the player-card avatar slots later.)
- Icons: prefer the repo's existing icon set (e.g. lucide) over the emoji used in the sports pills and the 🔒 glyph.

## Files
- `marketing_site.dc.html` — marketing site reference (read inline styles + the logic block's `leaderboard`/`players` arrays).
- `app_prototype.dc.html` — player app reference (read template + `class Component` logic for state/behaviour).
- `support.js` — prototyping runtime only; **do not port.**
