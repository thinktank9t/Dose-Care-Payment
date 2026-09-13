"use client";

/** Last-resort boundary (root layout failed). No i18n context is available here. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F6F4EF", color: "#1A1D1A", padding: 22 }}>
        <h1>Something went wrong / কিছু একটা ভুল হয়েছে</h1>
        <p>Please try again. / আবার চেষ্টা করুন।</p>
        <button
          type="button"
          onClick={reset}
          style={{ height: 52, padding: "0 26px", borderRadius: 999, background: "#2F7D63", color: "#fff", border: 0, fontWeight: 600 }}
        >
          Try again / আবার চেষ্টা করুন
        </button>
      </body>
    </html>
  );
}
