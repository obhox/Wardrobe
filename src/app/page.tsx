import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Landing from "@/components/landing/Landing";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/studio");

  return <Landing />;
}
