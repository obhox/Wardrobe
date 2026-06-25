import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import CombinationLock from "@/components/auth/CombinationLock";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/studio");

  return (
    <main className="ground-field min-h-dvh flex items-center justify-center p-6">
      <CombinationLock />
    </main>
  );
}
