import type { Metadata } from "next";
import DocumentJuridiquePublic from "@/components/juridique/DocumentJuridiquePublic";
import PiedDePagePublic from "@/components/public/PiedDePagePublic";
import { chargerDocumentJuridiquePublie } from "@/lib/documentsJuridiquesPublics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conditions générales de vente | Arboboard",
};

export default async function CgvPage() {
  const document =
    await chargerDocumentJuridiquePublie("cgv");

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="flex-1">
        <DocumentJuridiquePublic
          document={document}
          titreIndisponible="Conditions générales de vente non publiées"
        />
      </div>

      <PiedDePagePublic compact />
    </div>
  );
}