import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ProfilExport = {
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
        .select(
          "id, email, nom, prenom, role, statut, entreprise_id"
        )
        .eq("id", user.id)
        .single();

    if (profilError || !profil?.entreprise_id) {
      return NextResponse.json(
        { erreur: "Profil ou entreprise introuvable." },
        { status: 403 }
      );
    }

    const profilType = profil as ProfilExport;

    if (
      profilType.statut &&
      normaliser(profilType.statut) !== "actif"
    ) {
      return NextResponse.json(
        { erreur: "Compte utilisateur inactif." },
        { status: 403 }
      );
    }

    const [
      entrepriseResultat,
      consentementsResultat,
      historiqueConsentementsResultat,
      demandesResultat,
      journalResultat,
    ] = await Promise.all([
      supabaseAdmin
        .from("entreprises_abonnees")
        .select(
          "id, nom_entreprise, email_contact, telephone, adresse, code_postal, ville, siret, numero_tva, forme_juridique, plan_abonnement, statut_abonnement, created_at"
        )
        .eq("id", profilType.entreprise_id)
        .maybeSingle(),
      supabaseAdmin
        .from("consentements_utilisateurs")
        .select(
          "type_consentement, accorde, version_document, source, accorde_at, retire_at, updated_at"
        )
        .eq("utilisateur_id", user.id)
        .eq("entreprise_id", profilType.entreprise_id),
      supabaseAdmin
        .from("consentements_historique")
        .select(
          "type_consentement, accorde, version_document, source, created_at"
        )
        .eq("utilisateur_id", user.id)
        .eq("entreprise_id", profilType.entreprise_id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("demandes_rgpd")
        .select(
          "id, type_demande, statut, commentaire_utilisateur, reponse_interne, source, recue_at, echeance_reponse, prolongee_jusqu_au, motif_prolongation, prise_en_charge_at, terminee_at, annulee_at, created_at, updated_at"
        )
        .eq("utilisateur_id", user.id)
        .eq("entreprise_id", profilType.entreprise_id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("journal_activite")
        .select(
          "action, categorie, ressource_type, ressource_id, resultat, description, details, created_at"
        )
        .eq("utilisateur_id", user.id)
        .eq("entreprise_id", profilType.entreprise_id)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    const erreurs = [
      entrepriseResultat.error,
      consentementsResultat.error,
      historiqueConsentementsResultat.error,
      demandesResultat.error,
      journalResultat.error,
    ].filter(Boolean);

    if (erreurs.length > 0) {
      throw erreurs[0];
    }

    const exportPersonnel = {
      informations_export: {
        genere_at: new Date().toISOString(),
        format: "JSON",
        portee:
          "Données personnelles liées au compte utilisateur Arboboard. Les données métiers de l’entreprise ne sont pas incluses dans cet export personnel.",
      },
      authentification: {
        id: user.id,
        email: user.email,
        telephone: user.phone || null,
        compte_cree_at: user.created_at,
        derniere_connexion_at: user.last_sign_in_at,
        metadata_utilisateur: user.user_metadata || {},
      },
      profil_utilisateur: profil,
      appartenance_entreprise:
        entrepriseResultat.data || null,
      consentements_actuels:
        consentementsResultat.data || [],
      historique_consentements:
        historiqueConsentementsResultat.data || [],
      demandes_rgpd:
        demandesResultat.data || [],
      journal_activite_personnel:
        journalResultat.data || [],
    };

    const nomFichier =
      `arboboard-donnees-personnelles-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

    return new NextResponse(
      JSON.stringify(exportPersonnel, null, 2),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json; charset=utf-8",
          "Content-Disposition":
            `attachment; filename="${nomFichier}"`,
          "Cache-Control":
            "no-store, private, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "Erreur export données personnelles :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          "Impossible de générer l’export personnel.",
      },
      { status: 500 }
    );
  }
}