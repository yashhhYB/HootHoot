import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/get-session";
import { getCompanyTests, getAllTestsAnalytics } from "@/features/company/actions";
import CompanyDashboardClient from "./CompanyDashboardClient";
import type { Metadata } from "next";
import type { ArenaUser } from "@/types/arena";

export const metadata: Metadata = {
  title: "Company Dashboard — HootHoot",
  description: "Create and manage assessment tests, view results, and analyze candidate performance.",
};

export default async function CompanyPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.userType !== "company") {
    redirect("/arena/auth?role=company&redirect=/company");
  }

  const user: ArenaUser = {
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
    role: "company",
    avatar_url: null,
    created_at: sessionUser.createdAt,
  };

  const [tests, analytics] = await Promise.all([
    getCompanyTests(sessionUser.id),
    getAllTestsAnalytics(sessionUser.id),
  ]);

  return <CompanyDashboardClient user={user} tests={tests} analytics={analytics} />;
}
