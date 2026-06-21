import { supabase } from "@/lib/supabaseClient";

export type TypeNumeroDocument = "devis" | "facture" | "avoir";

export async function genererNumeroDocumentClient(
  typeDocument: TypeNumeroDocument
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  const response = await fetch("/api/documents/generer-numero", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      typeDocument,
    }),
  });

  const resultat = await response.json().catch(() => null);

  if (!response.ok || !resultat?.success || !resultat?.numero) {
    throw new Error(
      resultat?.error || "Impossible de générer le numéro du document."
    );
  }

  return String(resultat.numero);
}