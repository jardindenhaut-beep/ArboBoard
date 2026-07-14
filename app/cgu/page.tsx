import type { Metadata } from "next";
import DocumentJuridiquePublic from "@/components/juridique/DocumentJuridiquePublic";
import { chargerDocumentJuridiquePublie } from "@/lib/documentsJuridiquesPublics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conditions générales d’utilisation | Arboboard",
};

export default async function CguPage() {
  const document =
    await chargerDocumentJuridiquePublie("cgu");

  return (
    <DocumentJuridiquePublic
      document={document}
      titreIndisponible="Conditions générales d’utilisation non publiées"
    />
  );
}