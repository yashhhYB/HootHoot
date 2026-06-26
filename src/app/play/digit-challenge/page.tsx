import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import DigitGame from "./DigitGame";

export const metadata: Metadata = {
  title: "Digit Challenge — Brain Game | Hoot-Hoot",
  description:
    "Play Digit Challenge - a fun number sequence puzzle game. Test your logic and reflexes with timed challenges. Play free online now on Hoot-Hoot.",
  alternates: {
    canonical: `${siteConfig.url}/play/digit-challenge`,
  },
  openGraph: {
    title: "Digit Challenge | Blync Cognitive Games",
    description:
      "Practice Digit Challenge for Capgemini & Cognizant placement tests. Number sequence puzzles with 30-second timers and live scoring.",
    url: `${siteConfig.url}/play/digit-challenge`,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Digit Challenge — Blync Cognitive Games",
      },
    ],
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Digit Challenge",
  operatingSystem: "Web",
  applicationCategory: "EducationalApplication",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  url: `${siteConfig.url}/play/digit-challenge`,
  description:
    "Number sequence puzzle practice for Capgemini and Cognizant placement tests.",
};

export default function DigitChallengePage() {
  // Open to everyone — no authentication required to play
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <DigitGame />
    </>
  );
}
