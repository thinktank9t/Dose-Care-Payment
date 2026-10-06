# Dose Care — UI/UX Guidelines

The design system as it actually exists in this repo, written down so a new
screen (an admin dashboard, in particular) can be built without re-deriving it.

**Source of truth is `src/app/globals.css`.** Every token and utility named here
is defined there. If this file and the stylesheet disagree, the stylesheet wins —
fix this file. For the dashboard-specific application of these rules, see
[`admin-dashboard-guidelines.md`](./admin-dashboard-guidelines.md).

---

## 1. The five rules everything else follows

1. **Light only, no gradients.** `color-scheme: light only` is set on `:root`.
   There is no dark mode and no half-built dark mode. Flat fills everywhere —
   the loading skeletons were deliberately written as a flat `--bg-alt` fill with
   an opacity pulse rather than the usual shimmer sweep, because a sweep is a
   gradient.
2. **Paper, not chrome.** Cream page (`--bg`), white cards (`--surface`),
   hairline borders (`--line`, a 10% ink alpha — never a solid grey). No
   shadows, no elevation layers. Depth comes from the surface/page contrast and
   the hairline, nothing else.
3. **One accent.** `--accent` (#2f7d63) carries every affirmative action and
   every "this is premium" signal. Warn and danger are *states*, not decoration.
4. **The resting state is the rendered state.** Server HTML already shows the
   finished thing; JS and GSAP only add motion on top. No entrance flash, no
   layout shift, nothing missing if the JS never arrives (see the long comment
   at the top of `src/components/CareAnimation.tsx` — that reasoning is the house
   style, not one component's quirk).
5. **Two languages, equal weight.** English and Bangla are both first-class.
   Every string comes from `messages/*.json`. Bangla is not an afterthought —
   it gets its own font stack, line-heights and label treatment.

---

## 2. Color tokens

Defined on `:root` and re-exported into Tailwind via `@theme inline`, so every
token is usable as a utility: `bg-surface`, `text-ink-2`, `border-line`,
`bg-accent-soft`, etc.

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| `--bg` | `#f6f4ef` | `bg-bg` | Page plane. Also the `themeColor`. |
| `--bg-alt` | `#efebe2` | `bg-bg-alt` | Table headers, footer, inset notes, skeletons. Usually at `/60`–`/70`. |
| `--surface` | `#ffffff` | `bg-surface` | Cards, fields, anything raised. |
| `--ink` | `#1a1d1a` | `text-ink` | Headings, primary values, emphasis. |
| `--ink-2` | `#5a615a` | `text-ink-2` | Body copy, secondary cells, help text. |
| `--ink-3` | `#9a958c` | `text-ink-3` | Micro labels, placeholders, em-dash stand-ins. |
| `--line` | `rgba(26,29,26,0.1)` | `border-line` | Every border and divider. |
| `--accent` | `#2f7d63` | `bg-accent` / `text-accent` | Primary buttons, focus ring, icon accents. |
| `--accent-soft` | `#dceadf` | `bg-accent-soft` | Selected pills, avatars, badges, field focus glow. |
| `--accent-ink` | `#0f3a2c` | `text-accent-ink` | Accent-colored *text* (readable where `--accent` is not). |
| `--warn` / `--warn-soft` | `#b85c2f` / `#f7e3d4` | | "Pending" / needs attention. |
| `--danger` / `--danger-soft` | `#a43d3d` / `#f6dede` | | "Rejected" / destructive. |

**The soft/ink pairing is the pattern.** A status or badge is always
`bg-*-soft` + the matching `text-*` (or `text-accent-ink` for green). Never a
saturated fill behind small text.

### Semantic status mapping — fixed, do not improvise

From `src/components/StatusPill.tsx`:

| Status | Classes |
|---|---|
| `pending` | `bg-warn-soft text-warn` |
| `verified` | `bg-accent-soft text-accent-ink` |
| `rejected` | `bg-danger-soft text-danger` |

Any new state must pick one of these three families or add a token to
`globals.css` — not an inline hex.

### Known contrast caveat

`--ink-3` on `--bg` is ~2.7:1 (the one Accessibility flag in the production
Lighthouse run — README §Known issues). That is acceptable for 11px uppercase
micro labels, which are navigational chrome. **It is not acceptable for data.**
In a dashboard, any number, name, date or ID a user has to read goes in `--ink`
or `--ink-2`. Reserve `--ink-3` for `label-micro`, placeholders, and the `—`
used for empty cells.

---

## 3. Typography

Three families, wired through `next/font` in `src/app/[locale]/layout.tsx`:

- `--font-heading` → **Fraunces** (variable, `opsz` axis) — all `h1/h2/h3` and
  large numbers. Weight **400** in English, **500** in Bangla.
- `--font-body` → **Inter** — everything else. Body is `15px / 1.55`.
- `--font-noto-bengali` → **Noto Sans Bengali** — becomes the primary family for
  both body and headings when `html[lang="bn"]`, with `line-height: 1.75`.

### Scale

| Role | Size | Notes |
|---|---|---|
| `h1` | 34px → 44px @768 | `line-height 1.1`, `letter-spacing -0.8px` |
| `h2` | 26px → 30px @768 | `1.05 / -0.6px` |
| `h3` | 20px | `1.2 / -0.3px` |
| body | 15px | `1.55` |
| `text-body-lg` | 17px | Hero lead paragraphs only |
| `text-small` | 13px | Secondary cells, captions, help text |
| `label-micro` | 11px | uppercase, `letter-spacing 1.4px`, weight 600, `--ink-3` |

`h1,h2,h3` get `text-wrap: balance` globally. Off-scale sizes are set inline with
arbitrary values where a heading needs to be smaller than its level implies
(`<h1 className="text-[26px]">`, `<h2 className="text-[22px]">`) — that is the
accepted escape hatch; keep the semantic level correct and tune the size.

### Bangla overrides you must not undo

- Headings in Bangla go to weight 500 and `letter-spacing: 0` (Fraunces'
  tight tracking is wrong for Bangla glyphs).
- Line-heights loosen: `h1/h2` 1.3, `h3` 1.4, body 1.75.
- **Bangla has no upper case.** `label-micro` is overridden to 12px /
  `letter-spacing 0.6px` under `html[lang="bn"]`, because `text-transform:
  uppercase` does nothing and the wide tracking just shreds the word. Any new
  uppercase micro-label needs the same treatment.

### Monospace is a signal, not a style

`font-mono` means "this is an exact value the user will compare against
something outside the app" — transaction IDs, bKash sender numbers, the 6-char
user reference. TrxIDs additionally get letter-spacing (`tracking-wider` in the
admin table, `tracking-[0.1em]` at 16px on the account page) so a digit can be
read off one at a time.

---

## 4. Shape, spacing, size

| Thing | Value | Token/utility |
|---|---|---|
| Card radius | 18px | `--radius-card`, `.card` |
| Small card / skeleton radius | 16px | `--radius-card-sm` |
| Field radius | 14px | `.field` |
| Pills, buttons, avatars | full | `rounded-full` |
| Page gutter | 22px | `--gutter` |
| Content max width | 1040px | `.container-page` |
| Button height | 52px (`.btn`) / 40px (`.btn-sm`) | |
| Field height | 52px | `.field` |
| Pill height | 26px | `.pill` |
| Header height | 64px | `h-16` |

**Vertical rhythm.** Page sections open with `py-12` (`py-14` for a standalone
card page, `py-14 sm:py-20` for the hero). Inside a card: `p-6` is standard,
`p-5` for compact list rows, `p-7` for a lone focal card. Between stacked
cards: `space-y-3` (dense rows) / `space-y-4` / `space-y-6` (form steps) /
`space-y-8` (page sections). Gaps in grids: `gap-4` for cards, `gap-2` for
pills, `gap-10` for the footer columns.

**Small offsets are the voice of the system**: `mt-2` after a heading, `mt-3`
for a block, `mt-5`/`mt-8` to open distance. Don't introduce a new scale.

---

## 5. Component utilities

All declared with Tailwind v4 `@utility` in `globals.css`, so they compose with
ordinary utilities (`className="btn btn-primary btn-sm flex-1"`).

### `.card`
`--surface` fill, 1px `--line` border, 18px radius. No shadow, ever. Needs its
own padding. `overflow-hidden` when it wraps a table; `overflow-x-auto` when the
table can be wider than the card.

### `.btn` + variant
52px tall, pill, weight 600, 15px, `gap-10px` for a leading icon,
120ms transitions on background/opacity/transform.

| Variant | Look | Use |
|---|---|---|
| `.btn-primary` | solid `--accent`, white text | The one affirmative action per view |
| `.btn-secondary` | transparent, `--line` border, `--accent-ink` text | Everything alongside it |
| `.btn-danger` | `--danger-soft` fill, `--danger` text, transparent border | Destructive — deliberately *quiet* |

`.btn-sm` (40px / 18px inline / 14px) for in-row and in-card actions.
Interaction states are global: `hover` → opacity .92, `active` →
`translateY(1px)`, `disabled` → opacity .55 + `not-allowed` + no transform.

> **Destructive actions are soft-filled, not loud.** `Reject` sits next to
> `Verify` at the same size and the red is a tint, not a block. The system
> signals consequence through color *family*, not visual shouting.

### `.field`
52px, 14px radius, `--surface`, **16px font-size** (deliberate — anything
smaller triggers iOS zoom-on-focus). Placeholder is `--ink-3`. Focus:
`border-color: --accent` + `box-shadow: 0 0 0 3px --accent-soft`.
Compact variant in-table is `field h-10 rounded-xl text-[13px]`.

### `.pill`
26px, full radius, 12px/600, `gap-6px`, `white-space: nowrap`. Used for status
badges, "Best value", and filter tabs (resized there: `pill h-9 px-4 text-[13px]`).

### `.label-micro` / `<SectionLabel>`
The section eyebrow. Use the `SectionLabel` component when it labels a section;
use the raw class on `<th>` and inside composed blocks.

### `.skeleton`
`--bg-alt` fill + `--line` border + `dc-pulse` (1.4s opacity 0.6↔1). Shape it
with height/width utilities to match the real content.

### Focus, globally

```css
.btn:focus-visible, a:focus-visible, input:focus-visible,
textarea:focus-visible, select:focus-visible, button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

Never remove it, never replace it per component. If a custom control can take
focus, it must land in that selector list or carry the same ring.

### Icons

Inline SVG, hand-written, no icon library. The house shape:
`viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`,
`strokeWidth="2"`, round caps and joins, `aria-hidden`, and a `size` prop
(default 14–16). See `Footer.tsx` (`MailIcon`, `ArrowUpIcon`), `Spinner.tsx`,
`Sparkle.tsx`. `<Sparkle>` is the brand mark — it means *premium*, so don't
sprinkle it on neutral UI.

---

## 6. Page layout

```
<html lang={locale}>            ← lang follows the route; that's why the real
  <body class="flex min-h-svh flex-col">   html/body live in [locale]/layout.tsx
    <LocaleGuard/>              ← in <Suspense>, renders nothing
    <Header/>                   ← sticky top-0 z-20, h-16, bg-bg/90 backdrop-blur,
                                  border-b border-line, skip-link first child
    <main id="main" class="flex-1">{children}</main>
    <Footer/>                   ← mt-20, border-t, bg-bg-alt/60
```

Every page body opens with `<div className="container-page py-12">`. Reading-width
content is then capped again: `max-w-2xl` for forms and account-style pages,
`max-w-md` for a single notice card, `max-w-[56ch]` for a lead paragraph,
`max-w-[16ch]` for a hero headline.

The header's first child is the skip link —
`sr-only focus:not-sr-only focus:absolute …` targeting `#main`. Keep it.

---

## 7. States — every data view needs all five

This is the most systematised part of the codebase. Match it exactly.

**1. Loading (route level).** Every data-backed route has its own
`loading.tsx` rendering `<PageLoading cards={n} />`, which mirrors the page
shape (title skeleton, two lead lines, *n* card skeletons, then a spinner +
`common.loading`), wrapped in `role="status" aria-busy="true"`.

> There is deliberately **no `loading.tsx` at `[locale]`**. One there would also
> wrap the `[...rest]` catch-all, and streaming the shell commits a 200 before
> `notFound()` runs — unknown paths would stop answering 404. Add boundaries per
> route, never at the locale root. (This rationale is in `PageLoading.tsx`; keep
> it there.)

**2. Loading (in place).** A skeleton with the *same dimensions* as the real
content, so nothing jumps: `PriceCardsSkeleton` renders `h-[232px]` blocks in the
same grid as the live cards. Pair with a spinner + wording line
(`<Spinner size={15} />` + "Loading plans…") in `text-small text-ink-3`.

**3. Empty.** One plain sentence, no illustration, no CTA:
`<p className="p-6 text-ink-2">{t("empty")}</p>` — the admin table's "Nothing
here." Empty is not an error and shouldn't look like one.

**4. Error.** Soft-danger block with a retry:

```tsx
<div className="mt-4 rounded-2xl bg-danger-soft px-4 py-4" role="alert">
  <p className="text-small text-danger">{t("plansError")}</p>
  <button className="btn btn-secondary btn-sm mt-3" onClick={retry}>{t("plansRetry")}</button>
</div>
```

A read that fails must never take the page down — `PriceCards` catches and
degrades to a card with a message. Do the same for any dashboard widget.

**5. Forbidden.** A single card, not a redirect:
`<div className="card max-w-md p-7">` + `h1` + `p.mt-3.text-ink-2`, with a
`data-testid`. Unauthenticated → `redirect()` with `?next=`; authenticated but
unauthorized → show the card.

### Action results

Server-action results are **inline, next to the control** — not toasts:

```tsx
<p role="status" className="text-[12px] text-ink-2" data-testid="admin-result">{message}</p>
```

and the form carries `aria-busy={pending}`. There is no toast system in this
project; don't add one for a single confirmation.

---

## 8. Motion

- Transitions are **120ms ease** on `background-color`, `opacity`, `transform`
  only. Nothing else animates.
- Hover on links is `transition-colors`; press is a 1px nudge.
- GSAP exists for exactly one thing (the hero `CareAnimation`): loaded lazily
  after hydration, core only, transform/opacity only so every frame stays on
  the compositor, paused when off-screen or backgrounded.
- `prefers-reduced-motion: reduce` kills **all** transitions
  (`* { transition: none !important }`), slows the spinner to 2s rather than
  stopping it (it's the only proof work is still running), and freezes skeletons
  at `opacity .8`. Any new animation must survive that block sensibly.

---

## 9. Accessibility contract

- Skip link to `#main` on every page.
- Headings descend properly; size is tuned with arbitrary values, not by picking
  the wrong level.
- Sections are labelled: `aria-labelledby` pointing at the real heading, or
  `aria-label` from a translated string (`<nav aria-label={t("colStatus")}>`).
- Tables use `<th scope="col">` and `<th scope="row">`.
- Current filter gets `aria-current="page"`.
- Busy regions get `aria-busy`; the thing that *started* the work owns the
  wording. `<Spinner>` is `aria-hidden` and announces nothing by design.
- Results announce via `role="status"`; failures via `role="alert"`.
- Decorative SVG and skeletons are `aria-hidden`.
- Avatar images use `alt=""` (the name is already text beside them).
- Target the 360px viewport — the Playwright suite runs mobile 360 + desktop.

---

## 10. Internationalisation

- **No literal UI strings in components.** Everything goes through
  `next-intl`: `getTranslations("ns")` in server components,
  `useTranslations("ns")` in client ones. Namespaces: `meta, nav, common,
  features, plans, getPremium, checkStatus, landing, signIn, pay, account,
  status, admin, legal, app, footer, errors`. A dashboard adds to `admin` (or a
  new `dashboard` namespace) — and **both** `messages/en.json` and
  `messages/bn.json`. `npm run check:messages` enforces parity; it is in CI.
- Counts use ICU plurals: `"count": "{count, plural, one {# payment} other {# payments}}"`.
- Interpolate, don't concatenate: `t("reviewedBy", { email })`.
- Dates: `formatDate` / `formatDateTime` from `src/lib/format.ts` — `en-GB` /
  `bn-BD`, `dateStyle: "medium"`, **always `timeZone: "Asia/Dhaka"`**. Never
  `toLocaleString` at a call site.
- Money: `formatBdt` → `৳ 1,234`, **Latin digits in both locales** (it has to
  match what bKash shows), `maximumFractionDigits: 0`, `৳ —` for null.
- Links are `Link` from `@/i18n/navigation`, and redirects are `redirect({ href, locale })`.
  Never `next/link` or `next/navigation` directly.
- Layout must survive Bangla's longer strings: `whitespace-nowrap` on buttons
  and nav items, `flex-wrap` on action rows, `min-w-0` + `truncate` on anything
  holding a name or email, `break-all` on raw emails.

---

## 11. Code conventions that affect UI

- **Server by default.** `"use client"` only where there is state or an event
  handler (`AdminPaymentActions`, `CopyButton`, `ClaimPremiumForm`,
  `PageLoading`, `LanguageSwitcher`, `CareAnimation`). Pages are async server
  components that `await params`, call `setRequestLocale`, then read data.
- **Mutations are server actions** driven by `useActionState`, which gives you
  `[state, action, pending]` — the pending flag drives `disabled`, the spinner
  and `aria-busy`. Action state is a discriminated union
  (`{status: "idle" | "done" | "error"}`), and the component maps it to
  translated copy.
- **Test hooks are part of the markup.** `data-testid` on anything the e2e suite
  drives, plus `data-*` for state the test asserts on: `data-status`,
  `data-plan-status`, `data-trx`. Add them as you build, not afterwards.
- Admin routes return `robots: { index: false, follow: false }` from
  `generateMetadata`.
- Design decisions live in a comment above the component (see `CheckStatusCard`,
  `PageLoading`, `CareAnimation`). Write the *why*, especially when the choice
  looks arbitrary.

---

## 12. Do / Don't

**Do**
- Reach for `.card`, `.btn`, `.field`, `.pill`, `.label-micro` before writing CSS.
- Add a token to `globals.css` when you need a new color.
- Give every async view a skeleton the same size as its content.
- Use `font-mono` for anything the user cross-checks externally.
- Keep one `.btn-primary` per view.

**Don't**
- Add a shadow, a gradient, or a dark mode.
- Use a solid grey border instead of `--line`.
- Put readable data in `--ink-3`.
- Introduce a UI or icon library — the primitives are 10 lines each.
- Hardcode a string, a date format, or a currency symbol.
- Animate anything but `transform` and `opacity`.
- Replace the focus ring.
