import type { Metadata } from "next";
import DocumentJuridiquePublic from "@/components/juridique/DocumentJuridiquePublic";
import PiedDePagePublic from "@/components/public/PiedDePagePublic";
import { chargerDocumentJuridiquePublie } from "@/lib/documentsJuridiquesPublics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conditions générales d’utilisation | Arboboard",
};

export default async function CguPage() {
  const document =
    await chargerDocumentJuridiquePublie("cgu");

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="flex-1">
        <DocumentJuridiquePublic
          document={document}
          titreIndisponible="Conditions générales d’utilisation non publiées"
        />
      </div>

      <PiedDePagePublic compact />
    </div>
  );
}