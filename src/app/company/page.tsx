import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCompanyTests, getAllTestsAnalytics } from "@/features/company/actions";
import CompanyDashboardClient from "./CompanyDashboardClient";
import type { Metadata } from "next";
import type { ArenaUser } from "@/types/arena";

export const metadata: Metadata = {
  title: "Company Dashboard — HootHoot",
  description: "Create and manage assessment tests, view results, and analyze candidate performance.",
};

export default async function CompanyPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  if (!session?.user) {
    redirect("/arena/auth?role=company&redirect=/company");
  }

  const user: ArenaUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? "User",
    role: "company",
    avatar_url: session.user.image ?? null,
    created_at: session.user.createdAt?.toISOString() ?? new Date().toISOString(),
  };

  const [tests, analytics] = await Promise.all([
    getCompanyTests(session.user.id),
    getAllTestsAnalytics(session.user.id),
  ]);

  return <CompanyDashboardClient user={user} tests={tests} analytics={analytics} />;
}
