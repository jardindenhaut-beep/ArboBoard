import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  TYPES_DOCUMENTS_JURIDIQUES,
  estTypeDocumentAvecAcceptation,
  type StatutDocumentJuridiquePublic,
  type TypeDocumentJuridique,
} from "@/lib/documentsJuridiques";

type ProfilUtilisateur = {
  id: string;
  entreprise_id?: string | null;
  statut?: string | null;
};

type DocumentJuridiqueBrut = {
  type_document: TypeDocumentJuridique;
  titre_publie?: string | null;
  version_publie?: string | null;
  publie_at?: string | null;
};

type AcceptationBrute = {
  utilisateur_id: string;
  type_document: string;
  version_document: string;
};

function creerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Configuration Supabase serveur incomplète.");
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
  if (!autorisation?.startsWith("Bearer ")) return null;
  return autorisation.slice(7).trim() || null;
}

function normaliser(valeur: string | null | undefined) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function statutSansAcceptation(
  document: DocumentJuridiqueBrut,
  publie: boolean
): StatutDocumentJuridiquePublic {
  return {
    type_document: document.type_document,
    titre: document.titre_publie,
    version: document.version_publie,
    publie_at: document.publie_at,
    publie,
    acceptation_requise: false,
    portee_acceptation: "aucune",
    utilisateurs_concernes: 0,
    utilisateurs_a_jour: 0,
    utilisateurs_a_mettre_a_jour: 0,
    entreprise_a_jour: null,
  };
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

    const { data: profil, error: profilError } = await supabaseAdmin
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

    const [documentsResultat, profilsResultat, acceptationsResultat] =
      await Promise.all([
        supabaseAdmin
          .from("documents_juridiques_plateforme")
          .select("type_document, titre_publie, version_publie, publie_at")
          .in("type_document", [...TYPES_DOCUMENTS_JURIDIQUES])
          .order("type_document"),
        supabaseAdmin
          .from("profils_utilisateurs")
          .select("id")
          .eq("entreprise_id", profilType.entreprise_id)
          .eq("statut", "actif"),
        supabaseAdmin
          .from("acceptations_contractuelles")
          .select("utilisateur_id, type_document, version_document")
          .eq("entreprise_id", profilType.entreprise_id)
          .in("type_document", [
            "politique_confidentialite",
            "cgu",
            "cgv",
          ]),
      ]);

    if (documentsResultat.error) throw documentsResultat.error;
    if (profilsResultat.error) throw profilsResultat.error;
    if (acceptationsResultat.error) throw acceptationsResultat.error;

    const documents = (documentsResultat.data || []) as DocumentJuridiqueBrut[];
    const utilisateursActifs = new Set(
      (profilsResultat.data || []).map((element) => element.id)
    );
    const acceptations =
      (acceptationsResultat.data || []) as AcceptationBrute[];

    const statuts = documents.map(
      (document): StatutDocumentJuridiquePublic => {
        const publie = Boolean(
          document.titre_publie &&
            document.version_publie &&
            document.publie_at
        );

        if (
          !publie ||
          !estTypeDocumentAvecAcceptation(document.type_document)
        ) {
          return statutSansAcceptation(document, publie);
        }

        const version = document.version_publie || "";
        const acceptationsVersion = acceptations.filter(
          (acceptation) =>
            acceptation.type_document === document.type_document &&
            acceptation.version_document === version
        );

        if (document.type_document === "cgv") {
          return {
            type_document: document.type_document,
            titre: document.titre_publie,
            version,
            publie_at: document.publie_at,
            publie: true,
            acceptation_requise: true,
            portee_acceptation: "entreprise",
            utilisateurs_concernes: 0,
            utilisateurs_a_jour: 0,
            utilisateurs_a_mettre_a_jour: 0,
            entreprise_a_jour: acceptationsVersion.length > 0,
          };
        }

        const utilisateursAJour = new Set(
          acceptationsVersion
            .map((acceptation) => acceptation.utilisateur_id)
            .filter((utilisateurId) => utilisateursActifs.has(utilisateurId))
        );

        const nombreUtilisateurs = utilisateursActifs.size;
        const nombreAJour = utilisateursAJour.size;

        return {
          type_document: document.type_document,
          titre: document.titre_publie,
          version,
          publie_at: document.publie_at,
          publie: true,
          acceptation_requise: true,
          portee_acceptation: "utilisateur",
          utilisateurs_concernes: nombreUtilisateurs,
          utilisateurs_a_jour: nombreAJour,
          utilisateurs_a_mettre_a_jour: Math.max(
            0,
            nombreUtilisateurs - nombreAJour
          ),
          entreprise_a_jour: nombreUtilisateurs === nombreAJour,
        };
      }
    );

    const utilisateursAMettreAJour = statuts.reduce(
      (total, document) =>
        total + document.utilisateurs_a_mettre_a_jour,
      0
    );

    const cgv = statuts.find(
      (document) => document.type_document === "cgv"
    );

    return NextResponse.json({
      documents: statuts,
      synthese_acceptations: {
        utilisateurs_actifs: utilisateursActifs.size,
        utilisateurs_a_mettre_a_jour: utilisateursAMettreAJour,
        cgv_entreprise_a_jour: cgv?.entreprise_a_jour ?? null,
      },
    });
  } catch (error) {
    console.error("Erreur lecture statuts juridiques :", error);
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