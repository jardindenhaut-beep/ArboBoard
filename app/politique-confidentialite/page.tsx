import type { Metadata } from "next";
import DocumentJuridiquePublic from "@/components/juridique/DocumentJuridiquePublic";
import { chargerDocumentJuridiquePublie } from "@/lib/documentsJuridiquesPublics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Arboboard",
};

export default async function PolitiqueConfidentialitePage() {
  const document =
    await chargerDocumentJuridiquePublie(
      "politique_confidentialite"
    );

  return (
    <DocumentJuridiquePublic
      document={document}
      titreIndisponible="Politique de confidentialité non publiée"
    />
  );
}