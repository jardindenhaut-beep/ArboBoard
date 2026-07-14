import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  type DocumentJuridiquePublie,
  type TypeDocumentJuridique,
} from "@/lib/documentsJuridiques";

function creerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Configuration Supabase serveur incomplète."
    );
  }

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function chargerDocumentJuridiquePublie(
  typeDocument: TypeDocumentJuridique
): Promise<DocumentJuridiquePublie | null> {
  const supabaseAdmin = creerSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("documents_juridiques_plateforme")
    .select(
      "id, type_document, titre_publie, contenu_publie, version_publie, publie_at"
    )
    .eq("type_document", typeDocument)
    .maybeSingle();

  if (error) {
    console.error(
      "Erreur chargement document juridique public :",
      error
    );
    return null;
  }

  if (
    !data?.titre_publie ||
    !data.contenu_publie ||
    !data.version_publie ||
    !data.publie_at
  ) {
    return null;
  }

  return {
    id: data.id,
    type_document: data.type_document as TypeDocumentJuridique,
    titre: data.titre_publie,
    contenu: data.contenu_publie,
    version: data.version_publie,
    publie_at: data.publie_at,
  };
}