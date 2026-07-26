import type { Metadata } from "next";
import DocumentJuridiquePublic from "@/components/juridique/DocumentJuridiquePublic";
import PiedDePagePublic from "@/components/public/PiedDePagePublic";
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
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="flex-1">
        <DocumentJuridiquePublic
          document={document}
          titreIndisponible="Mentions légales non publiées"
        />
      </div>

      <PiedDePagePublic compact />
    </div>
  );
}