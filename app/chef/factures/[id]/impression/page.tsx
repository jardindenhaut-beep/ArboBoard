"use client";

import { useParams } from "next/navigation";
import DocumentImpression from "@/components/documents/DocumentImpression";

export default function ImpressionFacturePage() {
  const params = useParams();
  const factureId = String(params?.id || "");

  return (
    <DocumentImpression
      typeDocument="facture"
      documentId={factureId}
    />
  );
}