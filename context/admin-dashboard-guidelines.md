# Admin Dashboard — UI/UX Guidelines

How to build an admin dashboard that looks and behaves like the rest of Dose
Care. Read [`ui-ux-guidelines.md`](./ui-ux-guidelines.md) first — this file
assumes those tokens, utilities and state patterns and only adds what a
dashboard needs on top.

**The reference implementation already in the repo is
`src/app/[locale]/admin/payments/page.tsx` + `src/components/AdminPaymentActions.tsx`
+ `src/components/StatusPill.tsx`.** Everything below either describes that page
or extends it. Sections marked **NEW** are not in the codebase yet — they are
the proposed pattern, written in the same idiom so they drop in cleanly.

---

## 1. What an admin screen is for here

An operator opens this to **make a judgement and record it**: match a
transaction ID against a bKash statement, then verify or reject. That shapes
everything:

- **The data is the interface.** No decorative hero, no illustration, no welcome
  copy. Title, one line of instruction, filters, table.
- **The instruction line is operational, not marketing.** The existing subtitle
  is *"Match each Transaction ID against the bKash statement before verifying."*
  Keep that register: tell the operator what to check.
- **Exact values must be readable one character at a time** — hence `font-mono`
  plus letter-spacing on IDs.
- **Nothing is irreversible without being obvious**, and a second operator
  acting first must be reported, not silently overwritten (`doneNoop`:
  *"Already processed by someone else."*).

---

## 2. Routes and access

```
/[locale]/admin/payments          ← exists; ?status=pending|verified|rejected|all
/[locale]/admin                   ← NEW: overview (KPIs + recent activity)
/[locale]/admin/users             ← NEW
/[locale]/admin/plans             ← NEW
```

Every admin page:

```tsx
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false, follow: false } };
}
```

Then, in the page body, in this order:

1. `setRequestLocale(rawLocale)`
2. `const session = await getSession()` — falsy → `redirect({ href: "/sign-in?next=%2Fadmin%2F…", locale })`
3. `await isAdminSession(session)` — false → render the **forbidden card**, don't redirect:

```tsx
<div className="container-page py-14">
  <div className="card max-w-md p-7" data-testid="admin-forbidden">
    <h1 className="text-[26px]">{t("forbiddenTitle")}</h1>
    <p className="mt-3 text-ink-2">{t("forbiddenBody")}</p>
  </div>
</div>
```

4. Only then read data.

Admin links stay **unlinked from the public header** on purpose (see the comment
in `Header.tsx`) — the routes work, they just aren't advertised. If you add
dashboard navigation, put it inside the dashboard shell, not in the public nav.

---

## 3. Shell **NEW**

The existing admin page uses the plain public shell (`Header` / `main` /
`Footer`) and that is correct for a single table. A multi-page dashboard wants a
sidebar — add it as a nested layout at `src/app/[locale]/admin/layout.tsx` so the
public chrome is untouched.

Rules:

- **Keep the public `Header`.** Same 64px sticky bar, same brand mark, same
  language switcher. The dashboard is the same product, not a separate app.
- **Drop the public `Footer`** inside `/admin` — it is marketing navigation.
- Sidebar: 240px, `border-r border-line`, `bg-bg-alt/40`, sticky under the
  header (`top-16`), collapses to a horizontal scrolling pill row under `sm`.
- Widen the content: `.container-page` caps at 1040px, which is right for prose
  and wrong for a table. Use `w-full px-[var(--gutter)]` (or add a
  `@utility container-wide { max-width: 1440px }` to `globals.css`) inside the
  admin layout, and keep the 22px gutter so it still lines up with the header.

```tsx
// src/app/[locale]/admin/layout.tsx
<div className="flex min-h-[calc(100svh-4rem)]">
  <aside className="sticky top-16 hidden w-60 shrink-0 self-start border-r border-line bg-bg-alt/40 py-8 sm:block">
    <nav aria-label={t("menu")} className="space-y-1 px-3">
      {/* NavItem per route */}
    </nav>
  </aside>
  <div className="min-w-0 flex-1">{children}</div>
</div>
```

Sidebar item, active and idle — reuse the filter-pill logic, not a new treatment:

```tsx
<Link
  href={href}
  aria-current={active ? "page" : undefined}
  className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors ${
    active ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:text-ink"
  }`}
>
```

---

## 4. Page header

```tsx
<div className="container-page py-12">
  <h1>{t("title")}</h1>
  <p className="mt-2 text-ink-2">{t("subtitle")}</p>
```

That's it — no breadcrumb, no avatar row, no action bar. A page-level action
(export, "add plan") goes on the same line as the `h1`, right-aligned, as a
`.btn-sm`:

```tsx
<div className="flex flex-wrap items-start justify-between gap-4">
  <div>
    <h1>…</h1>
    <p className="mt-2 text-ink-2">…</p>
  </div>
  <Link href="…" className="btn btn-secondary btn-sm">…</Link>
</div>
```

`flex-wrap` and `gap-4` are not optional — Bangla titles are longer.

---

## 5. Filters

One row, directly above the content it scopes, and **the filter is in the URL**
(`?status=pending`) so the view is linkable, refresh-safe and server-rendered.
Validate against a literal list and fall back to a default:

```tsx
const FILTERS: AdminFilter[] = ["pending", "verified", "rejected", "all"];
const filter = FILTERS.includes(status as AdminFilter) ? (status as AdminFilter) : "pending";
```

Default to the filter that represents **work to do** (`pending`), not `all`.

Markup — pills, selected one in accent-soft, count pushed to the end:

```tsx
<nav className="mt-6 flex flex-wrap gap-2" aria-label={t("colStatus")}>
  {FILTERS.map((f) => (
    <Link key={f} href={`/admin/payments?status=${f}`}
      aria-current={f === filter ? "page" : undefined}
      className={`pill h-9 px-4 text-[13px] ${
        f === filter ? "bg-accent-soft text-accent-ink"
                     : "border border-line bg-surface text-ink-2"}`}>
      {filterLabel[f]}
    </Link>
  ))}
  <span className="ml-auto self-center text-small text-ink-3">{t("count", { count: rows.length })}</span>
</nav>
```

If you add a date range **NEW**, it goes first in that same row (presets —
today / 7 / 30 / 90 days — before any custom range), it is also a URL param, and
**it scopes every KPI, chart and table on the page** so the numbers can't
disagree. Never give one card its own range.

A search box **NEW** is a `.field h-10 rounded-xl` in the same row, submitting a
`?q=` param — server-side filtering, not client-side filtering of a page of rows.

---

## 6. KPI tiles **NEW**

Four tiles max, in a `.card` grid above the table. The contract:

- **label** — `label-micro`, sentence meaning, no trailing colon.
- **value** — the number, in `font-heading` at 32–38px. (`PriceCards` already
  sets big numbers in Fraunces at `text-[38px] leading-none`; the dashboard
  follows that, not a sans, because the serif *is* this brand's display face.)
  Use the font's default proportional figures here — **not** `tabular-nums`,
  which makes a display-size number look gappy.
- **delta** — optional, signed, against a *named* period ("vs last 7 days").
  Color by direction × whether up is good, and always pair with a glyph or the
  sign, never color alone.
- **trend** — optional 12-point sparkline, `--ink-3`-weight line with the
  current period in `--accent`.

```tsx
<section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-labelledby="kpis">
  <h2 id="kpis" className="sr-only">{t("kpisHeading")}</h2>
  {tiles.map((k) => (
    <article key={k.key} className="card p-5" data-testid={`kpi-${k.key}`}>
      <p className="label-micro">{t(k.key)}</p>
      <p className="mt-2 font-heading text-[32px] leading-none text-ink">{k.value}</p>
      {k.delta ? (
        <p className={`mt-2 text-small ${k.good ? "text-accent-ink" : "text-danger"}`}>
          {k.good ? "↑" : "↓"} {k.delta} <span className="text-ink-3">{t("vsPrev")}</span>
        </p>
      ) : null}
    </article>
  ))}
</section>
```

Rules:
- Money through `formatBdt`, counts through ICU plurals — no raw `toString()`.
- A tile is **not a link** unless the whole tile navigates; if it does, make it
  an `<a>` wrapping the card and give it the global focus ring.
- `0` is a real value. Render `0`, not `—`. Use `—` (`text-ink-3`) only for
  *unknown*.
- One hero figure per view at most. Don't give all four tiles display size.

---

## 7. Charts **NEW**

Charts are optional here. A single number belongs in a tile, and a 20-row
comparison belongs in a table — reach for a chart only for **change over time**
(payments per day) or **composition** (plan mix).

### Chart tokens

Add these to `globals.css` alongside the existing tokens. They are derived from
the brand palette and **validated** against this project's actual surfaces
(`#ffffff` cards and `#f6f4ef` page) — all six slots pass the lightness band,
chroma floor, colorblind separation (worst adjacent ΔE 12.7), normal-vision
floor (worst adjacent ΔE 15.7) and 3:1 contrast checks:

```css
:root {
  /* Categorical — assign in this fixed order, never cycled. */
  --series-1: #11805d;  /* sage (brand) */
  --series-2: #2a6fb0;  /* blue */
  --series-3: #b85c2f;  /* orange (= --warn) */
  --series-4: #6b4fa3;  /* violet */
  --series-5: #a43d3d;  /* red (= --danger) */
  --series-6: #9c8512;  /* ochre */

  /* Sequential — one hue, light→dark (heatmaps, density). */
  --seq-100: #dceadf; --seq-200: #bcd9c4; --seq-300: #93c3a6; --seq-400: #5ca286;
  --seq-500: #2f7d63; --seq-600: #1d5f4a; --seq-700: #0f3a2c;

  /* Ordinal — discrete ordered steps (funnel, tiers). Starts darker so the
     lightest step still clears 2:1 on white. */
  --ord-1: #8abda0; --ord-2: #5ca286; --ord-3: #2f7d63; --ord-4: #1d5f4a;

  /* Diverging — blue ↔ orange, neutral --bg-alt midpoint.
     Not green↔red: that pair is unreadable for the most common CVD. */
  --div-neg-3: #2a6fb0; --div-neg-2: #5a92c6; --div-neg-1: #8fb6dc;
  --div-mid:   #efebe2;
  --div-pos-1: #e0a47f; --div-pos-2: #cd7b4d; --div-pos-3: #b85c2f;

  /* Chart chrome */
  --grid: rgba(26, 29, 26, 0.07);
  --axis: rgba(26, 29, 26, 0.18);
}
```

Hard rules:
- **Slot order is a safety mechanism, not taste.** Series 1 is always
  `--series-1`. Adding or filtering a series must never repaint the survivors —
  color follows the entity, never its rank.
- **Scatter / bubble / small-multiple forms cap at three series** (slots 1–3).
  Those put every pair on screen at once, and slot 4 onward can't clear the
  separation floor in that condition. Fold the rest into "Other" or facet.
  Slots 1–3 together sit in the colorblind warn band, so in those forms add
  secondary encoding — direct labels, shape, or a gap.
- **Never a dual-axis chart.** Two measures of different scale → two charts, or
  index both to a common base.
- **Sequential is one hue**, light→dark. Never a rainbow, never a hue at a
  diverging midpoint.
- **Status colors stay reserved.** `--warn` / `--danger` / `--accent` mean
  pending / rejected / verified. Don't reuse them as "series 4" in a chart that
  also shows status.

### Marks and chrome

Thin marks. 2px lines, ≥8px point markers, 4px rounded bar ends anchored to the
baseline, a 2px `--surface` gap between adjacent or stacked fills, and a 2px
`--surface` ring where marks overlap. Gridlines are hairlines in `--grid`, the
baseline in `--axis`, tick labels in `--ink-2` at 13px with
`font-variant-numeric: tabular-nums` (axis ticks *are* a column, so tabular is
right here — unlike a KPI value).

**Text never wears the series color.** Values, labels and legend text stay in
`--ink` / `--ink-2` / `--ink-3`; identity comes from a colored dot or line-key
*beside* the text.

### Interaction and accessibility

- Ship hover by default: crosshair + tooltip on line/area, per-mark tooltip on
  bar/dot/cell. Hit targets larger than the mark.
- ≥2 series → a legend is always present; ≤4 series are also directly labeled,
  so identity is never color-alone.
- Every chart has a table equivalent reachable from the same card (a
  `<details>` holding a real `<table>` is enough) — that's also the fallback
  the contrast rules require for the lighter slots.
- Wrap the chart in `figure` + `figcaption`, or give the SVG `role="img"` and an
  `aria-label` stating the takeaway, not "chart of payments".
- There is no dark mode in this project, so there is no dark palette to pick —
  don't auto-invert.

---

## 8. Data table

The canonical spec, as implemented on `/admin/payments`.

### Frame

```tsx
<div className="card mt-5 overflow-x-auto">
  {rows.length === 0 ? (
    <p className="p-6 text-ink-2">{t("empty")}</p>
  ) : (
    <table className="w-full min-w-[860px] border-collapse text-[14px]">
```

- The card clips and scrolls the table; the table declares a `min-w-[…]` so
  columns never crush. **Horizontal scroll is the accepted mobile behaviour for
  a dense admin table** — the card edge makes it discoverable.
- Body text drops to `14px` (one step under body) for density. Don't go smaller.

### Header

```tsx
<thead>
  <tr className="border-b border-line bg-bg-alt/60 text-left">
    <Th>{t("colUser")}</Th>
    …
```

with the local helper:

```tsx
function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="label-micro px-4 py-3 font-semibold">{children}</th>;
}
```

`label-micro` on `<th>` is the table-header treatment across the app
(`ComparisonTable` uses the same). Add `sticky top-16 z-10` to the `thead` cells
for long tables **NEW**.

### Rows and cells

```tsx
<tr className="border-b border-line align-top last:border-b-0"
    data-testid="admin-row" data-trx={p.trx_id}>
  <td className="px-4 py-3">…</td>
```

- `px-4 py-3` everywhere. `align-top`, because a cell may hold three stacked
  lines.
- `border-b border-line last:border-b-0` — no zebra striping, no row hover fill.
- Every row carries a `data-testid` and the natural key as a `data-*` attribute.
- **Identity cells stack**: primary in `font-medium text-ink`, secondary in
  `text-small text-ink-2`, tertiary in `text-small text-ink-3`.
- **Exact values get `font-mono`** (`tracking-wider` for TrxIDs).
- **Money** via `formatBdt`; **dates** via `formatDateTime(value, locale)` in
  `text-ink-2`. Never a bare ISO string.
- **Missing values are `—`**, not blank, not "N/A".
- **Status cell** = `<StatusPill status={…} />`, with the audit trail under it in
  `text-[12px]`: who reviewed it, when, and the note in quotes.
- **Actions column** renders the control only when the row can be acted on;
  otherwise `<span className="text-ink-3">—</span>`.

### Sort, pagination, bulk **NEW**

- Sort: `?sort=submitted&dir=desc`, header becomes a `<button>` inside the
  `<th>` with `aria-sort` on the `<th>`. Keep the arrow glyph in `--ink-3`.
- Pagination: server-side via `?page=`, controls below the card —
  `btn btn-secondary btn-sm` prev/next plus `text-small text-ink-3` range text.
  Prefer increasing the page size over adding infinite scroll; an operator needs
  a stable, linkable view.
- Bulk selection: only if an operator genuinely acts on many rows at once. The
  toolbar appears **above** the table as a `.card p-4` strip with the count and
  the actions; bulk destructive actions need an explicit confirm step, which
  single-row actions do not.

### Mobile alternative **NEW**

For a table with ≤5 meaningful fields, render a card list under `sm` instead of
scrolling — the account page's payment list is the pattern to copy
(`<li className="card p-5">` with the key value and the `StatusPill` on one
`flex-wrap` row, metadata beneath, admin note in a `rounded-2xl bg-bg-alt/70`
block). Keep the table from `sm` up.

---

## 9. Row actions and mutations

The `AdminPaymentActions` pattern, which every row-level mutation should follow:

```tsx
"use client";
const [state, action, pending] = useActionState<AdminActionState, FormData>(reviewPayment, { status: "idle" });

<form action={action} className="flex w-56 flex-col gap-2" aria-busy={pending}>
  <input type="hidden" name="paymentId" value={paymentId} />
  <input name="note" maxLength={500} placeholder={t("notePlaceholder")}
         className="field h-10 rounded-xl text-[13px]" data-testid="admin-note" />
  <div className="flex gap-2">
    <button type="submit" name="action" value="verify" disabled={pending}
            className="btn btn-primary btn-sm flex-1" data-testid="admin-verify">
      {pending ? <Spinner size={14} /> : null}
      {pending ? t("working") : t("verify")}
    </button>
    <button type="submit" name="action" value="reject" disabled={pending}
            className="btn btn-danger btn-sm flex-1" data-testid="admin-reject">
      {t("reject")}
    </button>
  </div>
  {message ? <p role="status" className="text-[12px] text-ink-2" data-testid="admin-result">{message}</p> : null}
</form>
```

What matters in it:

1. **A real `<form>` with a server action**, so it works before hydration. One
   form per row; two submit buttons distinguished by `name="action"`.
2. **`pending` drives everything** — `disabled`, `aria-busy`, the spinner, and
   the label swap to `t("working")`. The affirmative button is the one that
   shows progress.
3. **The optional note is part of the decision**, placed above the buttons, and
   its placeholder says where it will be seen: *"Note (optional, shown to the
   user)"*. State the audience of free text.
4. **Every outcome has translated copy**, including the ones nobody plans for:
   `doneVerified`, `doneRejected`, `doneNoop` ("Already processed by someone
   else"), `errForbidden`, `errInvalid`, `errUnknown`. Map the union to a string
   in the component; never render a raw error.
5. **The result is inline and `role="status"`** — no toast, no modal.
6. **No confirmation dialog for a single reversible row action.** The soft-red
   `btn-danger` and the audit trail are the safety net. Reserve confirms for
   bulk and for anything that can't be undone.

Where an action has no note and no state, a bare submit button is fine
(`signOut` on the account page: `<form action={signOut}><button className="btn btn-secondary btn-sm">`).

---

## 10. Loading

Add `loading.tsx` to **every** admin route:

```tsx
import { PageLoading } from "@/components/PageLoading";
export default function Loading() { return <PageLoading cards={4} />; }
```

`cards` should roughly match the shape below the title — 4 for a table page.
Remember: **no `loading.tsx` at `[locale]`** (it would break 404s on the
catch-all). For a widget that loads independently, use a `Skeleton` sized to the
real content and a `role="status" aria-busy="true"` wrapper with a spinner line.

---

## 11. Translations to add

A dashboard is not done until `messages/bn.json` matches `messages/en.json` —
`npm run check:messages` runs in CI. Extend the existing `admin` namespace;
match its tone (terse, operational, sentence case):

```
admin.kpisHeading, admin.kpiPendingCount, admin.kpiVerifiedToday,
admin.kpiRevenueBdt, admin.vsPrev, admin.rangeToday, admin.range7,
admin.range30, admin.range90, admin.searchPlaceholder, admin.sortBy,
admin.pageRange, admin.prev, admin.next, admin.selectedCount,
admin.bulkVerify, admin.bulkConfirm, admin.chartTitleDaily, admin.showTable
```

Counts use ICU plurals. Anything with a number interpolates (`{count}`,
`{email}`, `{date}`) — never string concatenation.

---

## 12. Ship checklist

- [ ] `generateMetadata` returns `robots: { index: false, follow: false }`.
- [ ] Unauthenticated → `redirect({ href: "/sign-in?next=…", locale })`; non-admin → forbidden card with `data-testid`.
- [ ] `loading.tsx` present, `cards` matching the page shape.
- [ ] Empty, error (with retry) and forbidden states all render.
- [ ] Filters, search, sort, page and date range are all URL params; default filter is "work to do".
- [ ] Table: `min-w-[…]` inside `overflow-x-auto .card`, `label-micro` `<th scope="col">`, `px-4 py-3`, `align-top`, `last:border-b-0`.
- [ ] IDs in `font-mono`; money through `formatBdt`; dates through `formatDateTime` (Asia/Dhaka); missing values `—`; `0` rendered as `0`.
- [ ] No readable data in `--ink-3`.
- [ ] Mutations: real `<form>` + server action, `pending` → `disabled` + `aria-busy` + spinner + "Working…", every union branch has copy, result inline in `role="status"`.
- [ ] Destructive = `btn-danger` (soft), confirm only for bulk/irreversible.
- [ ] One `.btn-primary` per view.
- [ ] Charts (if any): tokens from §7 in fixed slot order, no dual axis, legend for ≥2 series, table fallback, `aria-label` stating the takeaway.
- [ ] `data-testid` + `data-*` state hooks on everything the e2e suite drives.
- [ ] Both `messages/en.json` and `messages/bn.json` updated; `npm run check:messages` passes.
- [ ] Usable at 360px and legible in Bangla (longer strings, `flex-wrap`, `min-w-0 truncate`).
- [ ] `npm run lint && npm run typecheck` clean.
