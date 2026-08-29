import { apiBlob, apiJson } from "./api";

export async function ouvrirPdf(typeDocument: "devis" | "facture" | "avoir", documentId: string) {
  const blob = await apiBlob("/api/documents/pdf", { typeDocument, documentId, mode: "inline" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function envoyerDocumentEmail(params: {
  typeDocument: "devis" | "facture" | "avoir";
  documentId: string;
  email: string;
  sujet?: string;
  message?: string;
}) {
  return apiJson("/api/documents/envoyer-email", {
    method: "POST",
    body: JSON.stringify({
      typeDocument: params.typeDocument,
      documentId: params.documentId,
      email: params.email,
      sujet: params.sujet,
      message: params.message,
    }),
  });
}

export async function transformerDevisEnFacture(devisId: string) {
  return apiJson<{ success?: boolean; factureId?: string; numero?: string; dejaExistante?: boolean }>(
    "/api/devis/transformer-en-facture",
    { method: "POST", body: JSON.stringify({ devisId }) }
  );
}
