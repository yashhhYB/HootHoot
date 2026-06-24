import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-core";
import { getCompanyTests, getAllTestsAnalytics } from "@/features/company/actions";
import CompanyDashboardClient from "./CompanyDashboardClient";
import type { Metadata } from "next";
import type { ArenaUser } from "@/types/arena";

export const metadata: Metadata = {
  title: "Company Dashboard — HootHoot",
  description: "Create and manage assessment tests, view results, and analyze candidate performance.",
};

export default async function CompanyPage() {
  const authUser = await getCurrentUser().catch(() => null);

  if (!authUser) {
    redirect("/arena/auth?role=company&redirect=/company");
  }

  const user: ArenaUser = {
    id: authUser.id,
    email: authUser.email,
    name: authUser.name,
    role: "company",
    avatar_url: authUser.avatar_url,
    created_at: authUser.createdAt.toISOString(),
  };

  const [tests, analytics] = await Promise.all([
    getCompanyTests(authUser.id),
    getAllTestsAnalytics(authUser.id),
  ]);

  return <CompanyDashboardClient user={user} tests={tests} analytics={analytics} />;
}
