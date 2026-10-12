# Dose Care Web — UI/UX Guidelines (revamp target)

The design language of the **Dose Care mobile app**, written down so the web
payment/premium site can be rebuilt to look and feel like the product it sells.

**Source of truth is the app, not the website.** Every token below is lifted
from:

- `lib/core/theme/app_colors.dart` — palette, dark mode, high contrast
- `lib/core/theme/app_text_styles.dart` — type scale
- `lib/core/theme/app_icons.dart` — icon system (`AppIconName`, stroke 1.6)
- `lib/app/app.dart` — input decoration, text-scale multipliers

If this file and the Dart disagree, **the Dart wins — fix this file.** If this
file and the web's `src/app/globals.css` disagree, **this file wins — fix the
stylesheet.** That direction is the point of the revamp.

Anything marked **[web-only]** has no counterpart in the app and is a
deliberate web addition (hover, focus rings, pending status). Anything marked
**[do not port]** exists in the app and should *not* come to the web.

---

## 0. What changed in this revision

The previous version of this file described a sage-green, light-only system. The
app no longer looks like that. Three structural changes:

| | Old web system | App today |
|---|---|---|
| Accent | sage `#2F7D63` | ocean `#0B5575` |
| Page / ink | cream `#F6F4EF` / `#1A1D1A` | cool grey `#F3F6F8` / `#0F1C24` |
| Themes | light only, dark mode banned | light + dark + system, **plus** a high-contrast override |
| Text size | fixed | user multiplier 1.0 / 1.15 / 1.3 |
| `warn` | amber `#B85C2F` | crimson `#C2334F` (urgency, not "pending") |
| Skeletons | flat pulse, gradients banned | 1200ms shimmer sweep |
| Icon stroke | 2 | 1.6 |

So the revamp is, in order: (1) swap the token values, (2) add a dark theme and
a high-contrast theme, (3) make the layout survive 130% text, (4) re-point
`warn` usage, (5) retune skeletons and icon strokes. Steps 1–3 are the work;
4–5 are cleanup.

Note: `.context/design/tokens.md` still documents the old sage palette too. It
is stale in the same way this file was.

---

## 1. The five rules everything else follows

1. **Calm and clinical, never bright.** Cool neutrals, one ocean accent,
   generous whitespace, no clutter. This is a product elderly users take
   medicine by; nothing competes for attention except the thing you must do
   next.
2. **Paper, not chrome.** Page (`--bg`), raised surfaces (`--surface`), and a
   hairline (`--line`, a 10% ink alpha — never a solid grey). Depth comes from
   surface/page contrast and the hairline. Shadows are rare and reserved: in the
   app only bottom sheets, the Google sign-in button and the brand mark carry
   one. A card never does.
3. **One accent.** `--accent` carries every affirmative action, active state and
   "this is premium" signal. `--warn` and `--danger` are *states*, not
   decoration.
4. **Three themes, one layout.** Light, dark, and a high-contrast override that
   composes with both (it darkens ink and thickens the hairline — it is not a
   fourth theme). Plus a text-size multiplier up to 1.3. A design that only
   works at light/1.0 is unfinished.
5. **The resting state is the rendered state.** Server HTML already shows the
   finished thing; JS adds motion on top. No entrance flash, no layout shift,
   nothing missing if the JS never arrives. (The reasoning in
   `src/components/CareAnimation.tsx` is house style, not one component's quirk.)

---

## 2. Color tokens

All values verbatim from `AppColors`. Dart getter → CSS custom property is 1:1
(`bgAlt` → `--bg-alt`), re-exported into Tailwind via `@theme inline` so each is
usable as `bg-surface`, `text-ink-2`, `border-line`, `bg-accent-soft`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F3F6F8` | `#0B141A` | Page plane. Also `themeColor`. |
| `--bg-alt` | `#E6EDF1` | `#111E26` | Table headers, footer, inset notes, segmented-control track. |
| `--surface` | `#FFFFFF` | `#15232C` | Cards, fields, sheets — anything raised. |
| `--ink` | `#0F1C24` | `#EAF1F4` | Headings, primary values, emphasis. |
| `--ink-2` | `#4D5D67` | `#A9B8C0` | Body copy, secondary cells, help text. |
| `--ink-3` | `#8A98A1` | `#71828C` | Micro labels, placeholders, em-dash stand-ins. |
| `--line` | `rgba(15,28,36,0.10)` | `rgba(234,241,244,0.12)` | Every border and divider. |
| `--accent` | `#0B5575` | `#5BB8DC` | Primary buttons, focus ring, active nav, icon accents. |
| `--accent-soft` | `#DAEEF5` | `#123A4D` | Selected pills, avatars, badges, tint blocks. |
| `--accent-ink` | `#06324A` | `#BFE6F4` | Accent-colored *text* on `--accent-soft`. |
| `--on-accent` | `#FFFFFF` | `#04202C` | Text/icons **on** `--accent`. Note it is not white in dark. |
| `--accent-bright` | `#1E7396` | `#8FD3EC` | Hover/pressed accent, accent-on-accent detail. |
| `--warn` | `#C2334F` | `#F58BA0` | Urgency: overdue, missed. |
| `--warn-soft` | `#FBE2E7` | `#3A1A23` | Urgency tint block. |
| `--danger` | `#A43D3D` | `#E57A7A` | Destructive, and the app's most urgent state (low stock). |
| `--danger-soft` | `#F6DEDE` | `#3A1D1D` | Destructive tint block. |

**Do not port:** `alarmBg` (`#0B5575` / `#0E4A66`) and the six `medGlyphTints`.
The first is the full-screen alarm plane, the second is per-medicine icon
chips — neither has a web surface. If the web ever lists a user's medicines,
take the tints from `AppColors.medGlyphTints` rather than inventing any.

**The soft/ink pairing is the pattern.** A status or badge is always
`bg-*-soft` + the matching `text-*` (or `text-accent-ink` for accent). Never a
saturated fill behind small text. `--on-accent` is the one exception, and it is
the only token allowed on an `--accent` fill.

### The CSS block to paste into `globals.css`

High contrast overrides **only** ink, ink-2, ink-3 and line — it does not touch
`--bg` or `--surface`. That is what the app does; match it exactly.

```css
:root {
  color-scheme: light dark;

  --bg: #f3f6f8;        --bg-alt: #e6edf1;    --surface: #ffffff;
  --ink: #0f1c24;       --ink-2: #4d5d67;     --ink-3: #8a98a1;
  --line: rgba(15, 28, 36, 0.1);
  --accent: #0b5575;    --accent-soft: #daeef5;
  --accent-ink: #06324a; --on-accent: #ffffff; --accent-bright: #1e7396;
  --warn: #c2334f;      --warn-soft: #fbe2e7;
  --danger: #a43d3d;    --danger-soft: #f6dede;
  --pending: #7a5116;   --pending-soft: #f7e9d4;   /* [web-only], see §3 */
}

:root:not([data-theme="light"]) { /* system dark */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0b141a;      --bg-alt: #111e26;    --surface: #15232c;
    --ink: #eaf1f4;     --ink-2: #a9b8c0;     --ink-3: #71828c;
    --line: rgba(234, 241, 244, 0.12);
    --accent: #5bb8dc;  --accent-soft: #123a4d;
    --accent-ink: #bfe6f4; --on-accent: #04202c; --accent-bright: #8fd3ec;
    --warn: #f58ba0;    --warn-soft: #3a1a23;
    --danger: #e57a7a;  --danger-soft: #3a1d1d;
    --pending: #e5b770; --pending-soft: #3a2e1a;
  }
}
:root[data-theme="dark"] { /* same block again — explicit user choice */ }

/* High contrast composes with either theme. */
:root[data-contrast="high"] {
  --ink: #000000; --ink-2: #26343c; --ink-3: #4a5963;
  --line: rgba(15, 28, 36, 0.4);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"])[data-contrast="high"] {
    --ink: #ffffff; --ink-2: #d3dee3; --ink-3: #a9b8c0;
    --line: rgba(234, 241, 244, 0.4);
  }
}
:root[data-theme="dark"][data-contrast="high"] {
  --ink: #ffffff; --ink-2: #d3dee3; --ink-3: #a9b8c0;
  --line: rgba(234, 241, 244, 0.4);
}
```

`body` gets an explicit `background: var(--bg)`. Theme choice is an attribute on
`<html>` so the server can render it and there is no flash: `data-theme` of
`light | dark` (absent = follow the OS, which is the app's "System"), and
`data-contrast="high"`. Both mirror app settings; if the site ever shares a
session with the app, read them from the same profile.

### Known contrast caveats — read before using a token

| Pair | Ratio | Verdict |
|---|---|---|
| `--ink` on `--bg` | 15.5:1 | Anything. |
| `--ink-2` on `--bg` | 5.9:1 | Body copy, data. |
| `--ink-3` on `--bg` | **2.6:1** | 11px uppercase micro labels, placeholders, and the `—` empty-cell stand-in **only**. |
| `--on-accent` on `--accent` | 8.2:1 | Buttons. |
| `--accent-ink` on `--accent-soft` | 11.2:1 | Badges, pills. |
| `--warn` on `--warn-soft` | **4.4:1** | Just under AA for small text. Use at 13px/600 or larger, and always with a leading glyph (§7). |
| `--pending` on `--pending-soft` | 5.8:1 | Badges, pills. |

**Any number, name, date or ID a user has to read goes in `--ink` or
`--ink-2`.** `--ink-3` is navigational chrome. This was the one Accessibility
flag in the production Lighthouse run (README §Known issues) and it is accepted
only on that basis.

---

## 3. Semantic status mapping — fixed, do not improvise

The web has a payment state the app does not: **pending**. The app's `warn` is
now a crimson that reads as *"you missed a dose"* — wrong for "we are checking
your payment", which is calm news. So pending gets its own amber family,
derived from the app's amber MedGlyph tint rather than invented:

| Status | Background | Text | Glyph |
|---|---|---|---|
| `pending` | `bg-pending-soft` | `text-pending` | `clock` |
| `verified` | `bg-accent-soft` | `text-accent-ink` | `checkCircle` |
| `rejected` | `bg-danger-soft` | `text-danger` | `alertCircle` |

`--pending-soft` `#F7E9D4` is `medGlyphTints[1].bg` verbatim. `--pending`
`#7A5116` is **[web-only]**: the tint's own foreground `#B8863C` only reaches
2.6:1 on it, so it is darkened to clear AA (5.8:1). Dark mode uses the dark
tint pair `#3A2E1A` / `#E5B770`.

Reserve `--warn` on the web for genuine urgency — an expiring subscription, a
payment that will lapse. Not for "pending".

Any new state picks one of these four families or adds a token to
`globals.css` — never an inline hex.

---

## 4. Typography

Same two families as the app, both bundled as variable fonts
(`assets/fonts/Inter[slnt,wght].ttf`, `Fraunces[opsz,wght].ttf`), wired on the
web through `next/font` in `src/app/[locale]/layout.tsx`:

- `--font-heading` → **Fraunces** (`opsz` axis) — all `h1/h2/h3` and large
  numbers. Weight **400**; **500** in Bangla.
- `--font-body` → **Inter** — everything else. Body is `15px / 1.55`.
- `--font-noto-bengali` → **Noto Sans Bengali** — primary family for body *and*
  headings when `html[lang="bn"]`, `line-height: 1.75`. **[web-only]**: the app
  renders Bangla through Inter/Fraunces fallbacks.

### Scale — `AppTextStyles`, one to one

| Role | App style | Size | Weight | Notes |
|---|---|---|---|---|
| `h1` | `h1` | 34px → 44px @768 | 400 | `line-height 1.1`, `letter-spacing -0.8px` |
| `h2` | `h2` | 26px → 30px @768 | 400 | `1.05 / -0.6px` |
| `h3` | `h3` | 20px | 400 | `1.2 / -0.3px` |
| `text-body-lg` | `bodyL` | 17px | 400 | Lead paragraphs, list titles |
| body | `body` | 15px | 400 | `1.55`, `--ink` |
| `text-small` | `small` | 13px | 400 | Secondary cells, captions, help text — `--ink-2` |
| `label-micro` | `micro` | 11px | **500** | uppercase, `letter-spacing 1.4px`, `--ink-3` |

Two app behaviours to carry over: `micro` goes to **600** and `small` to **500**
under high contrast (`:root[data-contrast="high"]`), because thin small text is
the first thing to fail for the users who turn that setting on.

`h1,h2,h3` get `text-wrap: balance` globally. Off-scale sizes are set inline
where a heading needs to be smaller than its level implies
(`<h1 className="text-[26px]">`) — that is the accepted escape hatch; keep the
semantic level correct and tune the size.

**[do not port]** the app's 36–50px reminder/alarm headlines and the splash
mark. The web has no alarm surface; `h1` is the biggest type on the site.

### Text scaling is a feature, not an edge case

`lib/app/app.dart` multiplies every size by **1.0 / 1.15 / 1.3** from a user
setting, so the app's layouts are all built to stretch. The web equivalent is
the browser/OS font size, and the site must survive the same 130%:

- Size type in `rem`, not `px`, wherever a utility allows it.
- No fixed-height box containing text. `.btn` and `.field` get `min-height`,
  never `height`.
- No `overflow: hidden` on a text container that has no `truncate`.
- Test at 130% at 360px wide. That is the real worst case, not desktop.

### Bangla overrides you must not undo

- Headings go to weight 500 and `letter-spacing: 0` (Fraunces' tight tracking
  is wrong for Bangla glyphs).
- Line-heights loosen: `h1/h2` 1.3, `h3` 1.4, body 1.75.
- **Bangla has no upper case.** `label-micro` becomes 12px /
  `letter-spacing 0.6px` under `html[lang="bn"]`, because `text-transform:
  uppercase` does nothing there and wide tracking just shreds the word. Any new
  uppercase micro-label needs the same treatment.

### Monospace is a signal, not a style

`font-mono` means "this is an exact value the user will compare against
something outside the app" — transaction IDs, bKash sender numbers, the 6-char
user reference. TrxIDs additionally get letter-spacing (`tracking-wider` in the
admin table, `tracking-[0.1em]` at 16px on the account page) so a digit can be
read off one at a time. The app has no mono font; this is **[web-only]** and
stays, because cross-checking a bKash receipt is a web-only job.

---

## 5. Shape, spacing, size

The app's radius scale is `8 / 12 / 18 / 24 / 999`, and in practice **12 is the
default and 18 is the card**. The web's old 14px field radius has no app
counterpart — move fields to 12.

| Thing | Value | Token/utility |
|---|---|---|
| Card radius | 18px | `--radius-card`, `.card` |
| Small card / skeleton / inner block | 12px | `--radius-card-sm` |
| Field radius | **12px** | `.field` |
| Segmented-control track / inner slab | 12px / 9px | |
| Pills, buttons, avatars | full (999) | `rounded-full` |
| Page gutter | 22px | `--gutter` |
| Content max width | 1040px | `.container-page` |
| Button min-height | 52px (`.btn`) / 40px (`.btn-sm`) | matches the app's `minimumSize: Size(double.infinity, 52)` |
| Field min-height | 52px | `.field` |
| Pill | 20px/5px padding, auto height | `.pill` |
| Header height | 64px | `h-16` |

**Spacing is a 4px grid** (app convention; Tailwind's default scale already is
one). Card padding: `p-4` (16px) is the app's standard card inset, `p-6` for a
roomier web card, `p-7` for a lone focal card, `p-5` for compact list rows.
Page sections open with `py-12` (`py-14` standalone card page, `py-14 sm:py-20`
hero). Between stacked cards: `space-y-3` dense / `space-y-4` / `space-y-6`
form steps / `space-y-8` page sections. Grid gaps: `gap-4` cards, `gap-2`
pills, `gap-10` footer columns.

**Touch targets are ≥48px for anything primary.** This is an elderly-first
product: never an icon-only control for a primary action, on either platform.

---

## 6. Component utilities

All declared with Tailwind v4 `@utility` in `globals.css`, so they compose with
ordinary utilities (`className="btn btn-primary btn-sm flex-1"`).

### `.card`
`--surface` fill, 1px `--line` border, 18px radius, **no shadow**. Needs its own
padding. `overflow-hidden` when it wraps a table; `overflow-x-auto` when the
table can be wider than the card. A tappable card gets the whole card as the
hit area (the app wraps `MedicineCard` in one `InkWell`), not a trailing link.

### `.btn` + variant
52px min-height, pill (`StadiumBorder` in the app), weight **600**, 15px,
`gap-10px` for a leading icon, 120ms transitions, zero elevation.

| Variant | Look | Use |
|---|---|---|
| `.btn-primary` | solid `--accent`, `--on-accent` text | The one affirmative action per view |
| `.btn-secondary` | transparent, `--line` border, `--accent-ink` text | Everything alongside it |
| `.btn-danger` | `--danger-soft` fill, `--danger` text, transparent border | Destructive — deliberately *quiet* |

`.btn-sm` (40px / 18px inline / 14px) for in-row and in-card actions.
States: `hover` → `--accent-bright` for primary / opacity .92 otherwise,
`active` → `translateY(1px)`, `disabled` → opacity .55 + `not-allowed` + no
transform. A busy button keeps its label and swaps its leading icon for an
18px spinner — same as `AddMedicineFooter`'s save button; it never becomes a
bare spinner, because the label is what tells the user what is happening.

> **Destructive actions are soft-filled, not loud.** `Reject` sits next to
> `Verify` at the same size and the red is a tint, not a block. Consequence is
> signalled through color *family*, not visual shouting.

### `.field`
52px min-height, **12px** radius, `--surface` fill, 1px `--line` border,
**16px font-size** (deliberate — anything smaller triggers iOS zoom-on-focus).
Placeholder `--ink-3`. Focus: `border-color: --accent` — matching the app's
`focusedBorder` — plus `box-shadow: 0 0 0 3px --accent-soft` **[web-only]**,
since a web field needs a visible focus affordance a touch field does not.
Compact in-table variant: `field min-h-10 rounded-xl text-[13px]`.

### `.pill`
Full radius, `px-2.5 py-[5px]`, 11px/500 uppercase label (`micro`),
`gap-4px`, `white-space: nowrap`. **A status pill carries a leading glyph** at
11px, stroke 1.8 — `StatusPill` does this explicitly "so the status isn't
conveyed by color alone". That comment is the contract; keep the icon.
Filter tabs reuse the shape at `pill h-9 px-4 text-[13px]`.

### `.segmented` — port this from the app
Two-to-three mutually exclusive views (e.g. monthly/yearly plans) use the app's
`SegmentedControl`, not a row of pills: a `--bg-alt` track with `p-1` and 12px
radius, each option 44px tall with 9px radius, active option filled
`--accent-soft` with `--accent-ink` text at weight 500, inactive transparent
with `--ink-2` at 400.

### `.label-micro` / `<SectionLabel>`
The section eyebrow. Use the `SectionLabel` component when it labels a section;
the raw class on `<th>` and inside composed blocks.

### `.skeleton` — now a shimmer, not a pulse
The app sweeps a highlight band across a group of placeholder boxes
(`shared/widgets/skeletons/shimmer.dart`). Match it:

- Placeholder: `--bg-alt` fill, 1px `--line` border, 12px radius, shaped with
  height/width utilities to match the real content.
- One sweep per *layout*, not per box, so every placeholder shimmers in sync —
  a container-level overlay, `1200ms` linear, infinite.
- Band: transparent → white **35%** (light) / **8%** (dark) → transparent, stops
  `10% / 50% / 90%`. The low dark-mode alpha is deliberate: a full-strength
  white sweep glares on the dark palette.

This replaces the old flat-pulse rule. Gradients are no longer banned outright —
but a gradient is still only ever *motion*, never a fill. No gradient backgrounds,
buttons, or text.

### Focus, globally — **[web-only]**, and non-negotiable

```css
.btn:focus-visible, a:focus-visible, input:focus-visible,
textarea:focus-visible, select:focus-visible, button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

Never remove it, never replace it per component. A custom focusable control must
land in that selector list or carry the same ring.

### Icons

Inline SVG, hand-written, no icon library — mirroring `AppIcon`. House shape:
`viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`,
**`strokeWidth="1.6"`** (was 2 — the app's default, and the heavier stroke is
why web icons read as a different set), round caps and joins, `aria-hidden`,
`size` prop defaulting to 16. Bump to 1.8–2.2 only where the app does: small
glyphs inside pills (1.8) and the check on a filled button (2.2).

Name web icons after `AppIconName` so the two sets stay comparable: `pill`,
`capsule`, `drop`, `bell`, `check`, `checkCircle`, `chevronRight`,
`chevronLeft`, `chevronDown`, `plus`, `x`, `snooze`, `users`, `user`, `clock`,
`shield`, `sun`, `calendar`, `utensils`, `bottle`, `minus`, `notes`, `info`,
`sparkle`, `alertCircle`, `share`, `globe`, `contrast`, `speaker`,
`fingerprint`. `sparkle` is the brand/premium mark — don't sprinkle it on
neutral UI.

### Banners — port the app's shell
An inline notice (expiring plan, action needed) uses the app's banner shape
(`OverdueBanner` / `LowStockBanner`): tint-filled block, 18px radius, a 40px
circular icon chip at `color/14%`, title at body/600 in the state color, hint at
small in the same color at 85% alpha, trailing `chevronRight` if tappable, whole
block one hit target with a `Semantics`-equivalent `aria-label` combining title
and hint. Severity picks the family: `--warn` for overdue-style, `--danger` for
blocking.

---

## 7. Page layout

```
<html lang={locale} data-theme? data-contrast?>   ← lang follows the route; that's why the
  <body class="flex min-h-svh flex-col">            real html/body live in [locale]/layout.tsx
    <LocaleGuard/>              ← in <Suspense>, renders nothing
    <Header/>                   ← sticky top-0 z-20, h-16, bg-bg/90 backdrop-blur,
                                  border-b border-line, skip-link first child
    <main id="main" class="flex-1">{children}</main>
    <Footer/>                   ← mt-20, border-t, bg-bg-alt/60
```

Every page body opens with `<div className="container-page py-12">`.
Reading-width content is capped again: `max-w-2xl` for forms and account pages,
`max-w-md` for a single notice card, `max-w-[56ch]` for a lead paragraph,
`max-w-[16ch]` for a hero headline.

The header's first child is the skip link —
`sr-only focus:not-sr-only focus:absolute …` targeting `#main`. Keep it.

The app is single-column, full-bleed, content inset 20–24px from the edges, with
a 4-tab bottom nav. **[do not port]** the bottom nav — the web's primary nav is
the sticky header. But do keep the single-column, generous-inset feel on mobile
widths; the web should read as the same product at 360px.

---

## 8. States — every data view needs all five

The most systematised part of the codebase. Match it exactly.

**1. Loading (route level).** Every data-backed route has its own `loading.tsx`
rendering `<PageLoading cards={n} />`, which mirrors the page shape (title
skeleton, two lead lines, *n* card skeletons, then a spinner +
`common.loading`), wrapped in `role="status" aria-busy="true"`.

> There is deliberately **no `loading.tsx` at `[locale]`**. One there would also
> wrap the `[...rest]` catch-all, and streaming the shell commits a 200 before
> `notFound()` runs — unknown paths would stop answering 404. Add boundaries per
> route, never at the locale root. (This rationale lives in `PageLoading.tsx`;
> keep it there.)

**2. Loading (in place).** A skeleton with the *same dimensions* as the real
content, so nothing jumps: `PriceCardsSkeleton` renders `h-[232px]` blocks in
the same grid as the live cards, under one shimmer (§6). Pair with a spinner +
wording line (`<Spinner size={15} />` + "Loading plans…") in
`text-small text-ink-3`.

**3. Empty.** The app pairs a flat two-tone illustration (160px tall) with an
`h3` title, 6px gap, and a `body`-size line in `--ink-3`, centered, optional
single action below — see `AppEmptyState`. On the web, keep the *structure* but
illustrations are optional: a plain sentence
(`<p className="p-6 text-ink-2">{t("empty")}</p>`) is still right inside a
table. Empty is not an error and must not look like one. If you do add art,
match the app's style exactly: flat, two-tone `accent` + `accent-soft`, dashed
ring, centered glyph, soft `--bg-alt` ellipse beneath, no gradients, no
characters.

**4. Error.** Soft-danger block with a retry:

```tsx
<div className="mt-4 rounded-2xl bg-danger-soft px-4 py-4" role="alert">
  <p className="text-small text-danger">{t("plansError")}</p>
  <button className="btn btn-secondary btn-sm mt-3" onClick={retry}>{t("plansRetry")}</button>
</div>
```

A read that fails must never take the page down — `PriceCards` catches and
degrades to a card with a message. Do the same for any dashboard widget.

**5. Forbidden.** A single card, not a redirect: `<div className="card max-w-md
p-7">` + `h1` + `p.mt-3.text-ink-2`, with a `data-testid`. Unauthenticated →
`redirect()` with `?next=`; authenticated but unauthorized → show the card.

### Action results

Server-action results are **inline, next to the control** — not toasts:

```tsx
<p role="status" className="text-[12px] text-ink-2" data-testid="admin-result">{message}</p>
```

and the form carries `aria-busy={pending}`. There is no toast system in this
project; don't add one for a single confirmation. (The app uses bottom sheets
for confirmation flows — the web equivalent is a card on the page, not a modal.)

---

## 9. Motion

- Transitions are **120ms ease** on `background-color`, `opacity`, `transform`
  only. Nothing else animates.
- Hover on links is `transition-colors`; press is a 1px nudge.
- Skeleton shimmer is the one looping animation: 1200ms, transform-only (§6).
- GSAP exists for exactly one thing (the hero `CareAnimation`): loaded lazily
  after hydration, core only, transform/opacity only so every frame stays on the
  compositor, paused when off-screen or backgrounded.
- `prefers-reduced-motion: reduce` kills **all** transitions
  (`* { transition: none !important }`), stops the shimmer sweep and freezes
  skeletons at `opacity .8`, and slows the spinner to 2s rather than stopping it
  (it's the only proof work is still running). Any new animation must survive
  that block sensibly.

---

## 10. Accessibility contract

- Skip link to `#main` on every page.
- **Color is never the only signal.** Every status pill carries a glyph; every
  banner carries an icon chip. Straight from `StatusPill`.
- Honour all three themes and the high-contrast override; check each token pair
  in §2 after any palette edit.
- Survive 130% text at 360px wide (§4).
- Primary targets ≥48px. No icon-only primary actions.
- Headings descend properly; size is tuned with arbitrary values, not by picking
  the wrong level.
- Sections are labelled: `aria-labelledby` pointing at the real heading, or
  `aria-label` from a translated string (`<nav aria-label={t("colStatus")}>`).
- Tables use `<th scope="col">` and `<th scope="row">`.
- Current filter gets `aria-current="page"`.
- Busy regions get `aria-busy`; whatever *started* the work owns the wording.
  `<Spinner>` is `aria-hidden` and announces nothing by design.
- Results announce via `role="status"`; failures via `role="alert"`.
- Decorative SVG and skeletons are `aria-hidden`.
- Avatar images use `alt=""` (the name is already text beside them).
- A tappable composite (banner, card row) is one control with one accessible
  name combining its title and hint — the app does this with `Semantics(button:
  true, label: '$title. $hint')`.

---

## 11. Internationalisation

- **No literal UI strings in components.** Everything goes through `next-intl`:
  `getTranslations("ns")` in server components, `useTranslations("ns")` in
  client ones. Namespaces: `meta, nav, common, features, plans, getPremium,
  checkStatus, landing, signIn, pay, account, status, admin, legal, app, footer,
  errors`. A dashboard adds to `admin` (or a new `dashboard` namespace) — and
  **both** `messages/en.json` and `messages/bn.json`. `npm run check:messages`
  enforces parity; it is in CI.
- The web ships **en + bn**. The app ships nine locales (`en, bn, hi, es, pt,
  fr, ru, ja, id` — `lib/localization/l10n/*.arb`). Don't widen the web's set as
  part of a UI revamp, but build layouts that tolerate longer strings than
  English, because that gap will eventually close.
- Counts use ICU plurals: `"count": "{count, plural, one {# payment} other {# payments}}"`.
- Interpolate, don't concatenate: `t("reviewedBy", { email })`.
- Dates: `formatDate` / `formatDateTime` from `src/lib/format.ts` — `en-GB` /
  `bn-BD`, `dateStyle: "medium"`, **always `timeZone: "Asia/Dhaka"`**. Never
  `toLocaleString` at a call site.
- Money: `formatBdt` → `৳ 1,234`, **Latin digits in both locales** (it has to
  match what bKash shows), `maximumFractionDigits: 0`, `৳ —` for null.
- Links are `Link` from `@/i18n/navigation`; redirects are `redirect({ href, locale })`.
  Never `next/link` or `next/navigation` directly.
- Layout must survive Bangla's longer strings: `whitespace-nowrap` on buttons
  and nav items, `flex-wrap` on action rows, `min-w-0` + `truncate` on anything
  holding a name or email, `break-all` on raw emails.

---

## 12. Code conventions that affect UI

- **Server by default.** `"use client"` only where there is state or an event
  handler (`AdminPaymentActions`, `CopyButton`, `ClaimPremiumForm`,
  `PageLoading`, `LanguageSwitcher`, `CareAnimation`, and now the theme and
  contrast toggles). Pages are async server components that `await params`, call
  `setRequestLocale`, then read data.
- **Theme must not flash.** Resolve `data-theme` / `data-contrast` on the server
  from a cookie and render them on `<html>`. No client-only theme init.
- **Mutations are server actions** driven by `useActionState`, which gives
  `[state, action, pending]` — the pending flag drives `disabled`, the spinner
  and `aria-busy`. Action state is a discriminated union
  (`{status: "idle" | "done" | "error"}`), and the component maps it to
  translated copy.
- **Test hooks are part of the markup.** `data-testid` on anything the e2e suite
  drives, plus `data-*` for asserted state: `data-status`, `data-plan-status`,
  `data-trx`. Add them as you build. Add theme coverage to the Playwright matrix
  (mobile 360 + desktop) × (light + dark); high contrast and 130% text get at
  least one smoke run.
- Admin routes return `robots: { index: false, follow: false }` from
  `generateMetadata`.
- Design decisions live in a comment above the component (see `CheckStatusCard`,
  `PageLoading`, `CareAnimation`). Write the *why*, especially when the choice
  looks arbitrary — the app does the same, and those comments
  (`AppColors.sync`, `Shimmer`, `StatusPill`) are where half of this document
  came from.

---

## 13. Do / Don't

**Do**
- Take token values from `app_colors.dart` / `app_text_styles.dart`, and update
  this file when they change there.
- Reach for `.card`, `.btn`, `.field`, `.pill`, `.segmented`, `.label-micro`
  before writing CSS.
- Ship light, dark and high contrast together; a feature isn't done in one theme.
- Give every async view a skeleton the same size as its content, under one
  shared shimmer.
- Pair every status color with a glyph.
- Use `font-mono` for anything the user cross-checks externally.
- Keep one `.btn-primary` per view.

**Don't**
- Use the old sage palette (`#2F7D63`, `#F6F4EF`, `#1A1D1A`) anywhere.
- Add a shadow to a card, or a gradient to any fill.
- Put white text on `--accent` in dark mode — that's `--on-accent` (`#04202C`).
- Use `--warn` for "pending"; that's `--pending`.
- Put readable data in `--ink-3`.
- Set a fixed `height` on anything containing text.
- Introduce a UI or icon library — the primitives are 10 lines each.
- Hardcode a string, a date format, or a currency symbol.
- Animate anything but `transform` and `opacity`.
- Replace the focus ring.
