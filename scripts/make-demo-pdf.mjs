import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shots = join(root, "demo", "shots");
const out = join(root, "demo", "Dose-Care-Premium-UI-demo.pdf");
const base = "http://localhost:3001";

mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();

async function prep(page) {
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
  await page.evaluate(() => document.fonts.ready);
}

async function shot(page, name) {
  const file = join(shots, `${name}.png`);
  await page.screenshot({ path: file });
  return file;
}

const desktop = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
const page = await desktop.newPage();

await page.goto(`${base}/en`, { waitUntil: "networkidle" });
await prep(page);
const light = await shot(page, "light");

await page.locator("#compare").scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
const compare = await shot(page, "compare");

await page.evaluate(() => {
  document.documentElement.dataset.theme = "dark";
  delete document.documentElement.dataset.contrast;
  window.scrollTo(0, 0);
});
await page.waitForTimeout(150);
const dark = await shot(page, "dark");

await page.evaluate(() => {
  document.documentElement.dataset.theme = "dark";
  document.documentElement.dataset.contrast = "high";
  window.scrollTo(0, 0);
});
await page.waitForTimeout(150);
const contrast = await shot(page, "contrast");

await desktop.clearCookies();
await page.goto(`${base}/bn`, { waitUntil: "networkidle" });
await prep(page);
const bangla = await shot(page, "bangla");

await page.goto(`${base}/en/check-status`, { waitUntil: "networkidle" });
await prep(page);
const status = await shot(page, "status");

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
const phone = await mobile.newPage();
await phone.goto(`${base}/en`, { waitUntil: "networkidle" });
await prep(phone);
const narrow = await shot(phone, "mobile");

await browser.close();

const files = { light, compare, dark, contrast, bangla, status, narrow };

function img(file) {
  return `data:image/png;base64,${readFileSync(file).toString("base64")}`;
}

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; color: #0f1c24; background: #fff; }
  h1 { font-weight: 500; font-size: 28px; letter-spacing: -0.4px; margin: 0 0 8px; }
  h2 { font-weight: 600; font-size: 15px; margin: 0 0 6px; }
  p { margin: 0; color: #4d5d67; font-size: 12.5px; line-height: 1.5; }
  .kicker { font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: #0b5575; font-weight: 600; margin-bottom: 8px; }
  .cover { page-break-after: always; }
  .lede { max-width: 62ch; margin-top: 10px; }
  ul { margin: 14px 0 0; padding-left: 18px; color: #4d5d67; font-size: 12.5px; line-height: 1.55; }
  .meta { margin-top: 22px; font-size: 12px; color: #8a98a1; }
  figure { margin: 0; break-before: page; page-break-before: always; page-break-inside: avoid; }
  figcaption { margin-top: 8px; }
  img { width: 100%; border: 1px solid rgba(15,28,36,0.12); border-radius: 10px; display: block; }
  img.phone { width: 320px; margin-inline: auto; }
</style>
</head>
<body>
  <section class="cover">
    <div class="kicker">Dose Care · website</div>
    <h1>Premium site UI demo</h1>
    <p class="lede">The payment site now uses the same visual system as the Dose Care app: cool grey page, ocean accent, and light, dark, and high-contrast themes. These screens were captured from the local dev server on 15 October 2026.</p>
    <ul>
      <li>Accent is ocean #0B5575 (dark mode uses #5BB8DC with dark text on buttons).</li>
      <li>The header sun button cycles Match system, Light, and Dark. The second button turns on high contrast. The choice is kept in a cookie.</li>
      <li>Pending payments are amber with a clock. Crimson is only for something urgent, such as a lapsed plan.</li>
      <li>English and Bangla are both in the header.</li>
    </ul>
    <p class="meta">Local preview: http://localhost:3001/en · Prices still need the Supabase environment file, so the pricing block shows its fallback message.</p>
  </section>

  <figure>
    <img src="${img(files.light)}" alt="Landing page in light theme" />
    <figcaption>
      <h2>Landing, light</h2>
      <p>Default look when the reader follows the system theme and the system is light.</p>
    </figcaption>
  </figure>

  <figure>
    <img src="${img(files.dark)}" alt="Landing page in dark theme" />
    <figcaption>
      <h2>Landing, dark</h2>
      <p>Same page after choosing Dark. The primary button text is the dark on-accent colour, not white.</p>
    </figcaption>
  </figure>

  <figure>
    <img src="${img(files.contrast)}" alt="Landing page in dark high contrast" />
    <figcaption>
      <h2>Dark plus high contrast</h2>
      <p>High contrast keeps the same surfaces and thickens the borders. Headings go to white.</p>
    </figcaption>
  </figure>

  <figure>
    <img src="${img(files.compare)}" alt="Free versus Premium comparison" />
    <figcaption>
      <h2>Free versus Premium</h2>
      <p>The comparison table on the same landing page.</p>
    </figcaption>
  </figure>

  <figure>
    <img class="phone" src="${img(files.narrow)}" alt="Landing page on a phone-width screen" />
    <figcaption>
      <h2>Phone width</h2>
      <p>390px wide. The header wraps instead of clipping.</p>
    </figcaption>
  </figure>

  <figure>
    <img src="${img(files.bangla)}" alt="Landing page in Bangla" />
    <figcaption>
      <h2>Bangla</h2>
      <p>Same page at /bn. Headings use Noto Sans Bengali.</p>
    </figcaption>
  </figure>

  <figure>
    <img src="${img(files.status)}" alt="Check status page" />
    <figcaption>
      <h2>Check Premium status</h2>
      <p>A reader can look up a plan with the Google email they use in the app.</p>
    </figcaption>
  </figure>
</body>
</html>`;

const pdfPage = await chromium.launch();
const pdfContext = await pdfPage.newContext();
const doc = await pdfContext.newPage();
await doc.setContent(html, { waitUntil: "load" });
await doc.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
});
await pdfPage.close();

rmSync(shots, { recursive: true, force: true });
console.log(out);
