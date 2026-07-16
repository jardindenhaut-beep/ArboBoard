"use client";

import { useParams } from "next/navigation";
import DocumentImpression from "@/components/documents/DocumentImpression";

export default function ImpressionDevisPage() {
  const params = useParams();
  const devisId = String(params?.id || "");

  return (
    <DocumentImpression
      typeDocument="devis"
      documentId={devisId}
    />
  );
}