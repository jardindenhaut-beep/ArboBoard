import type { Metadata } from "next";
import DocumentJuridiquePublic from "@/components/juridique/DocumentJuridiquePublic";
import PiedDePagePublic from "@/components/public/PiedDePagePublic";
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
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="flex-1">
        <DocumentJuridiquePublic
          document={document}
          titreIndisponible="Politique de confidentialité non publiée"
        />
      </div>

      <PiedDePagePublic compact />
    </div>
  );
}