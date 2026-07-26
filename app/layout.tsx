import type { Metadata } from "next";
import "./globals.css";

const URL_SITE = "https://arboboard.fr";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: {
    default: "Arboboard — Logiciel de gestion pour paysagistes et élagueurs",
    template: "%s | Arboboard",
  },
  description:
    "Arboboard centralise les clients, devis, factures, fiches d’intervention, équipes et plannings des entreprises du paysage.",
  applicationName: "Arboboard",
  authors: [
    {
      name: "Arboboard",
      url: URL_SITE,
    },
  ],
  creator: "Arboboard",
  publisher: "Arboboard",
  category: "Logiciel de gestion",
  keywords: [
    "logiciel paysagiste",
    "logiciel élagueur",
    "gestion entreprise espaces verts",
    "devis paysagiste",
    "facturation paysagiste",
    "planning paysagiste",
    "fiches d’intervention",
    "Arboboard",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    siteName: "Arboboard",
    title:
      "Arboboard — Logiciel de gestion pour paysagistes et élagueurs",
    description:
      "Clients, devis, factures, fiches d’intervention, équipes et plannings réunis dans un seul espace professionnel.",
  },
  twitter: {
    card: "summary",
    title:
      "Arboboard — Logiciel de gestion pour paysagistes et élagueurs",
    description:
      "Clients, devis, factures, fiches d’intervention, équipes et plannings réunis dans un seul espace professionnel.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}