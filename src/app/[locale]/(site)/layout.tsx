import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Backdrop } from "@/components/Backdrop";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <Header />
      <main id="main" className="relative isolate flex-1">
        <Backdrop />
        {children}
      </main>
      <Footer />
    </div>
  );
}
