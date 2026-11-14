You are the UI/UX implementer for the Dose Care web app (Next.js, Tailwind v4, next-intl en/bn). This is an elderly-first medication product. Calm, clinical, one ocean accent. Do not invent a new visual language.

Source of truth, in this order:
1. context/web-new-ui-ux-guidance.md
2. src/app/globals.css tokens (--bg, --surface, --ink, --ink-2, --ink-3, --line, --accent, --gutter 22px, --radius-card 18px)
3. The existing components. Extend them. Do not restyle the product.

Rules you must not break:
- One hairline only: 1px solid var(--line). Never a solid grey, never a border plus a ring on the same edge.
- One content edge: every header, title, card, field, and footer column uses .container-page (max 1040px, padding-inline var(--gutter)). No extra px-1 or px-2 that shifts a block off that edge.
- Cards stay flat. No card shadow. Shadows stay limited to the bottom sheet, the Google button, and the floating Add button.
- Primary actions are at least 48px tall. The main button on a screen stays .btn .btn-primary (52px).
- Body text and names use --ink or --ink-2. --ink-3 is only for placeholders and true chrome, not for section titles a person must read.
- Works at 360px, in Bangla (taller line-height), in light, dark, and high contrast, and at text scale 1.3. No horizontal scroll. No truncated tab labels.
- Do not change payment rules, copy meaning, or routes except where a back link is specified below.

============================================================
PASS 1 — Shared chrome and the margin line
============================================================

Files: src/components/Header.tsx, src/components/care/AppShell.tsx, src/components/care/chrome.tsx, src/app/globals.css

1. Public header (Header.tsx), phone and desktop.
   Measured: at 390px and 360px the header is 97–98px because it wraps. At 1280px it is 65px.
   Make it one 64px row at every width.
   Left: logo, aligned to the gutter.
   Right: language switch, then one Sign in / Open app button.
   Remove theme and contrast from this header. They already live on Profile. Do not add a second row.
   Pricing and Get Premium stay visible from the sm breakpoint up, inside the same row. On a phone they are reached by the hero button and the footer. Give Pricing and Get Premium a 44px hit area (padding), text stays 14px.
   Header background is solid var(--bg), not bg-bg/90. One border-b border-line. Content must not show through the line.
   Sign in is at least 48px tall.

2. Signed-in header (AppShell.tsx).
   Keep the single 64px row: logo, tabs from md up, Add medicine from md up, language.
   Same solid background and single hairline as the public header.
   Desktop tab links are 38px tall. Make the hit area at least 44px. Active tab stays the accent-soft pill.

3. Phone bottom bar.
   Keep five tabs: Today, Medicines, Care, Premium, Profile.
   Remove truncate on the label. Allow two lines, 12px, centered, so “Medicines”, “প্রিমিয়াম”, and “প্রোফাইল” stay readable at 360px and at 130% text.
   Active state: one accent-soft pill behind the icon, same size for every tab, plus accent-ink label.
   Bar is bg-surface, one border-t border-line, plus the safe-area inset. No second line, no gap above the bar.
   /account, /pay, and /check-status must NOT mark the Premium tab as current. Only /get-premium does. Add a back control on those three pages (see Pass 3).

4. Floating Add medicine.
   It currently covers the “Up next” label on Today at 390px, and it shares a vertical band with the undo toast.
   Keep it on Today and Medicines only, phones only, right edge on the gutter.
   Main padding must clear the button and the tab bar, including safe area, so the last card and the section label are fully visible when scrolled to the end.
   While the undo toast is open, hide the Add button. Place the toast above the tab bar, full width inside the gutter, not on top of the Add button.

5. ScreenHeader (chrome.tsx).
   Measured: Today and Profile h1 start at x=22. Add-medicine and History h1 start at x=82, and the step bar has another px-2.
   Back button’s left edge is the gutter. Title sits beside it and may wrap. The step progress and the fields below start on the same left edge as the back button, not further in.
   Remove the extra px-1 on the header and the extra px-2 on the progress track.
   Back control is a 44px circle: bg-bg-alt, ink icon, visible on both the page and on a white card. The onboarding back button is currently bg-surface inside a white card, so the circle disappears. Use the same control there.

6. Progress tracks (onboarding and add-medicine).
   Inactive segment is bg-bg-alt. Done segment is bg-accent. Do not paint a segment with bg-line. --line is a 10% border colour and the track vanishes on white.

7. Sheets.
   On widths under md, the sheet is a bottom sheet: full width, radius on the top corners only, sitting above the tab bar, close control at least 44px. On md and up, keep the centered dialog. One hairline under the title.

8. Dividers.
   Inside a card, a divider is inset with the card padding (16px on rows, 20px on summary cards). Do not mix full-bleed and inset rules in the same card. One line, var(--line).

============================================================
PASS 2 — Public site, especially the phone
============================================================

Files: src/app/[locale]/(site)/premium/page.tsx, src/components/PriceCards.tsx, src/components/ComparisonTable.tsx, src/components/AppDownload.tsx, src/components/Footer.tsx, src/app/[locale]/(site)/sign-in/page.tsx

1. Price cards.
   The yearly card adds border-accent/40 and ring-1 ring-accent/20 on top of .card’s 1px border. That is a double fuzzy line.
   Selected plan: a single 2px solid var(--accent) border. No ring. Keep the “Best value” pill.

2. Comparison table, 360px.
   Feature names wrap (“Reminders and schedules”, “Patients you care for”) and the Free column looks loose.
   Feature column about 46% width, text wraps. Free and Premium stay nowrap, centered, one line. Row hairlines stay inset to the card. Outer card border remains the only outer line. Do this on both the public page and Get Premium.

3. FAQ.
   The visible heading is only the micro label, because the h2 is sr-only. Give this section a real h2, same pattern as “How it works” and “Simple plans” (SectionLabel, then h2, then the cards).

4. Hero.
   One status path. Keep “Check your Premium status” in the hero. The second “Already paid?” card under the prices can stay, but it must not repeat the same sentence. Make that card the action (“Check my status”) only.
   Buttons stack full width under sm. From sm up they sit in a row. Both are at least 48px. Get Premium is the only primary button in the hero.

5. App download.
   While the Play Store URL is still a placeholder, do not show a QR that looks scannable. Show the coming-soon state once: disabled store button, one pill, one sentence. When the URL is real, show the QR and a real link, and remove the pill.

6. Footer.
   Link rows need a 44px hit area. The email chip may wrap; it must stay inside the gutter. The top border of the footer is the only line between the page and the footer. The copyright row keeps its own inset hairline.

7. Sign-in card.
   Already a single card. Keep it. The legal links (Terms, Privacy) are 16px tall. Give each a 44px hit area without making the paragraph look like buttons.

============================================================
PASS 3 — Signed-in product
============================================================

Files: src/components/care/TodayScreen.tsx, MedicineScreens.tsx, ProfileScreen.tsx, CareScreens.tsx, HistoryScreens.tsx, src/app/[locale]/(app)/account/page.tsx, get-premium/page.tsx, src/components/ClaimPremiumForm.tsx

Today (phone first):
1. Greeting row does not wrap the avatar onto its own line. Avatar stays top-right, 48px, on the first line. The name wraps beside it. Date stays above, full width, on the gutter.
2. “Up next” and “Earlier today” are section titles. Set them in --ink-2, 13px, weight 600. They are not --ink-3.
3. Overdue and low-stock banners stay tint-only (no border). Their icon lines up with the icon inside the progress card: same 16px horizontal inset.
4. A future dose is not taken by tapping the card. The card opens the detail sheet. A separate “Taken” control on the row, at least 44px, marks it taken and shows the undo toast. Past doses keep the Late / Skipped pill and still open the sheet. The empty 24px circle is not the only affordance.
5. On desktop (1280), the progress card and the two dose columns share one top edge. Section labels align with the top of the progress card, not above it.

Medicines:
1. The low-stock filter is a 48px icon with no visible word. Add the visible label “Low stock” next to the icon, or a pill that toggles and shows the label. Keep the 48px target.
2. Add-medicine form. Stepper and colour swatches are 40px. Make them 48px. The amount row may stack under the label on a 360px screen so “1 tablet” is not crushed.
3. Removing a dose time is a 16px icon. Make that control 44px.
4. The primary Continue / Save button sticks to the bottom of the screen, directly above the tab bar, full width inside the gutter. The fields scroll behind it. The notes field and the button must both be fully visible and tappable. They must not sit under the tab bar.
5. Labels sit 8px above fields. Remove the -mt-2 that pulls a field into its label.

Profile:
1. Edit is 39px tall. Make it a 44px pill.
2. The two switches (high contrast, full-screen reminders) are 28px tall. Make the track 32px and the hit area 44px tall. The knob must stay inside the track in both positions (it currently uses left-[22px] on a 48px track and can touch the border).
3. Every row in the accessibility card has the same py-3 and min-h-14, so the hairlines are evenly spaced. Language, text size, appearance, contrast.
4. Segmented labels (“Extra large”, “আরও বড়”, “System / Light / Dark”) wrap to two lines inside the segment. Do not truncate. Segments stay equal width.

Care, History, prescriptions, reminder:
1. Any screen that is not a bottom-bar tab gets the ScreenHeader back control, left edge on the gutter.
2. History month arrows are 44px. Weekday letters stay on one line at 360px. Day cells keep a gap of at least 4px so their borders do not merge into one line.

Account, pay, check status:
1. These pages are opened from Profile or from Get Premium. Add ScreenHeader back: Account and check-status go to /profile, pay goes to /get-premium.
2. Center the max-w-2xl column (mx-auto) so the left and right margins match. Do not leave it stuck to the left under a full-width tab bar.
3. “No payments yet” sits in a card, same radius and hairline as the plan card, so the column has one edge.

Get Premium, signed in:
1. The person already chose Premium. Lead with step 1, choose a plan, then the bKash number and the Transaction ID. Put “What’s included” in a disclosure under the form, collapsed by default. Do not make them scroll past the comparison table to pay.
2. The Copy control is 27px tall. Make it 44px.
3. The submit button uses the same sticky rule as the medicine form: above the tab bar, never underneath it.

============================================================
PASS 4 — Check, then stop
============================================================

Check these views in the browser, light, at 360px and 1280px, English and Bangla. Then spot-check dark and high contrast and text scale 1.3 on Today, the add-medicine form, and Get Premium.

Phone, signed out: /en/premium, /bn/premium, /en/sign-in
Phone, signed in: Today, Medicines, Add medicine, Care, Profile, Account, Get Premium, History
Desktop: /en/premium and Today

Done means:
- Header is one row and one hairline at 360px.
- Titles, cards, fields, and the back button share the 22px gutter.
- Add medicine does not cover “Up next”.
- The yearly plan has one accent border, not a border plus a ring.
- A dose is marked taken only from the Taken control.
- Account has a back control and does not highlight the Premium tab.
- Get Premium shows the payment steps before the comparison table.
- No label is cut off with an ellipsis. No page scrolls sideways.

Do not redesign illustrations, do not add new colours, and do not change the payment or auth logic.