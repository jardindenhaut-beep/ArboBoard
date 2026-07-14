import type { Metadata } from "next";
import DocumentJuridiquePublic from "@/components/juridique/DocumentJuridiquePublic";
import { chargerDocumentJuridiquePublie } from "@/lib/documentsJuridiquesPublics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mentions légales | Arboboard",
};

export default async function MentionsLegalesPage() {
  const document =
    await chargerDocumentJuridiquePublie(
      "mentions_legales"
    );

  return (
    <DocumentJuridiquePublic
      document={document}
      titreIndisponible="Mentions légales non publiées"
    />
  );
}