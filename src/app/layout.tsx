// The real <html>/<body> live in [locale]/layout.tsx so `lang` can follow the
// locale. Next still needs a root layout; it just passes children through.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
