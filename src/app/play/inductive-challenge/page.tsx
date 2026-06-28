import type { Metadata } from "next";
import { siteConfig } from "@/config/site";



import InductiveGame from "./InductiveGame";

export const metadata: Metadata = {
  title: "Inductive Challenge — Logic Game | Hoot-Hoot",
  description:
    "Play Inductive Challenge - find visual patterns and improve your reasoning skills. A fun brain game that challenges your logical thinking.",
  alternates: {
    canonical: `${siteConfig.url}/play/inductive-challenge`,
  },
  openGraph: {
    title: "Inductive Challenge | Blync Cognitive Games",
    description:
      "Visual reasoning game for Capgemini placement prep. Find pairs of figures that follow the same pattern rule.",
    url: `${siteConfig.url}/play/inductive-challenge`,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Inductive Challenge — Blync Cognitive Games",
      },
    ],
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Inductive Challenge",
  operatingSystem: "Web",
  applicationCategory: "EducationalApplication",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  url: `${siteConfig.url}/play/inductive-challenge`,
  description:
    "Visual inductive reasoning game for Capgemini and Cognizant placement test practice.",
};

export default function InductiveChallengePage() {

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <InductiveGame />
    </>
  );
}
