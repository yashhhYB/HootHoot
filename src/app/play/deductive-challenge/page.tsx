import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import DeductiveGame from "./DeductiveGame";

export const metadata: Metadata = {
  title: "Deductive Challenge — Logic Puzzle Game | Hoot-Hoot",
  description:
    "Play Deductive Challenge - solve symbol-based logic puzzles and test your reasoning skills. A brain game designed to improve your logic and reflexes.",
  alternates: {
    canonical: `${siteConfig.url}/play/deductive-challenge`,
  },
  openGraph: {
    title: "Deductive Challenge | Blync Cognitive Games",
    description:
      "Practice Deductive Challenge for Capgemini placement tests. Symbol logic puzzles with 20-second timers.",
    url: `${siteConfig.url}/play/deductive-challenge`,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Deductive Challenge — Blync Cognitive Games",
      },
    ],
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Deductive Challenge",
  operatingSystem: "Web",
  applicationCategory: "EducationalApplication",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  url: `${siteConfig.url}/play/deductive-challenge`,
  description:
    "Symbol-based logical reasoning practice for Capgemini placement tests.",
};

export default function DeductiveChallengePage() {
  // Open to everyone — no authentication required to play
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <DeductiveGame />
    </>
  );
}
