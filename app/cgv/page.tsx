import type { Metadata } from "next";
import DocumentJuridiquePublic from "@/components/juridique/DocumentJuridiquePublic";
import { chargerDocumentJuridiquePublie } from "@/lib/documentsJuridiquesPublics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conditions générales de vente | Arboboard",
};

export default async function CgvPage() {
  const document =
    await chargerDocumentJuridiquePublie("cgv");

  return (
    <DocumentJuridiquePublic
      document={document}
      titreIndisponible="Conditions générales de vente non publiées"
    />
  );
}