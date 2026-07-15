import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ProfilUtilisateur = {
  id: string;
  entreprise_id?: string | null;
  statut?: string | null;
};

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

function obtenirJeton(request: NextRequest) {
  const autorisation = request.headers.get("authorization");

  if (!autorisation?.startsWith("Bearer ")) {
    return null;
  }

  return autorisation.slice(7).trim() || null;
}

function normaliser(valeur: string | null | undefined) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const jeton = obtenirJeton(request);

    if (!jeton) {
      return NextResponse.json(
        { erreur: "Authentification requise." },
        { status: 401 }
      );
    }

    const supabaseAdmin = creerSupabaseAdmin();

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jeton);

    if (userError || !user) {
      return NextResponse.json(
        { erreur: "Session invalide ou expirée." },
        { status: 401 }
      );
    }

    const { data: profil, error: profilError } =
      await supabaseAdmin
        .from("profils_utilisateurs")
        .select("id, entreprise_id, statut")
        .eq("id", user.id)
        .single();

    if (profilError || !profil?.entreprise_id) {
      return NextResponse.json(
        { erreur: "Profil ou entreprise introuvable." },
        { status: 403 }
      );
    }

    const profilType = profil as ProfilUtilisateur;

    if (
      profilType.statut &&
      normaliser(profilType.statut) !== "actif"
    ) {
      return NextResponse.json(
        { erreur: "Compte utilisateur inactif." },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("documents_juridiques_plateforme")
      .select(
        "type_document, titre_publie, version_publie, publie_at"
      )
      .in("type_document", [
        "mentions_legales",
        "politique_confidentialite",
        "cgu",
        "cgv",
      ])
      .order("type_document");

    if (error) throw error;

    return NextResponse.json({
      documents: (data || []).map((document) => ({
        type_document: document.type_document,
        titre: document.titre_publie,
        version: document.version_publie,
        publie_at: document.publie_at,
        publie: Boolean(
          document.titre_publie &&
            document.version_publie &&
            document.publie_at
        ),
      })),
    });
  } catch (error) {
    console.error(
      "Erreur lecture statuts juridiques :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger les documents juridiques.",
      },
      { status: 500 }
    );
  }
}