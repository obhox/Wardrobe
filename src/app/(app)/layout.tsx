import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import AppShell from "@/components/shell/AppShell";

export const dynamic = "force-dynamic";

// Everything under (app) needs a signed-in person and shares the app shell.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return <AppShell>{children}</AppShell>;
}
