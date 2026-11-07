import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/care/AppShell";
import { CareProvider } from "@/components/care/store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let session: { name: string; email: string | null } | null = null;
  try {
    const current = await getSession();
    if (current) session = { name: current.name, email: current.email };
  } catch {
    session = null;
  }

  return (
    <CareProvider session={session}>
      <AppShell>{children}</AppShell>
    </CareProvider>
  );
}
