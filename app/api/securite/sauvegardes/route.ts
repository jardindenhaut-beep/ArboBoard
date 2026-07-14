import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ProfilSauvegarde = {
  id: string;
  email?: string | null;
  nom?: string | null;
  prenom?: string | null;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type ExportEntreprise = {
  version_export?: string;
  genere_at?: string;
  entreprise_id?: string;
  nombre_tables?: number;
  tables?: Record<string, unknown>;
};

const ROLES_CHEF = new Set([
  "chef",
  "admin",
  "administrateur",
  "gerant",
  "dirigeant",
  "patron",
]);

function normaliser(valeur: string | null | undefined) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function creerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Configuration Supabase serveur incomplète."
    );
  }

  return createClient(url, secret, {
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

async function authentifier(request: NextRequest) {
  const jeton = obtenirJeton(request);

  if (!jeton) {
    return {
      erreur: NextResponse.json(
        { erreur: "Authentification requise." },
        { status: 401 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  const supabaseAdmin = creerSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(jeton);

  if (userError || !user) {
    return {
      erreur: NextResponse.json(
        { erreur: "Session invalide ou expirée." },
        { status: 401 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
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
    return {
      erreur: NextResponse.json(
        { erreur: "Profil ou entreprise introuvable." },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  const profilType = profil as ProfilSauvegarde;

  if (
    !ROLES_CHEF.has(normaliser(profilType.role)) ||
    (
      profilType.statut &&
      normaliser(profilType.statut) !== "actif"
    )
  ) {
    return {
      erreur: NextResponse.json(
        { erreur: "Accès réservé au chef d’entreprise." },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  return {
    erreur: null,
    supabaseAdmin,
    profil: profilType,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authentification = await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const { supabaseAdmin, profil } = authentification;

    const { data, error } = await supabaseAdmin
      .from("sauvegardes_entreprise")
      .select(
        "id, type_sauvegarde, format_fichier, statut, nombre_tables, taille_octets, empreinte_sha256, message_erreur, created_at"
      )
      .eq("entreprise_id", profil.entreprise_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({
      sauvegardes: data || [],
    });
  } catch (error) {
    console.error(
      "Erreur lecture sauvegardes :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger l’historique des sauvegardes.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authentification = await authentifier(request);

  if (
    authentification.erreur ||
    !authentification.supabaseAdmin ||
    !authentification.profil
  ) {
    return authentification.erreur;
  }

  const { supabaseAdmin, profil } = authentification;

  try {
    const depuisUneMinute = new Date(
      Date.now() - 60_000
    ).toISOString();

    const { data: recente, error: recenteError } =
      await supabaseAdmin
        .from("sauvegardes_entreprise")
        .select("id, created_at")
        .eq("entreprise_id", profil.entreprise_id)
        .eq("statut", "terminee")
        .gte("created_at", depuisUneMinute)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (recenteError) throw recenteError;

    if (recente) {
      return NextResponse.json(
        {
          erreur:
            "Une sauvegarde vient déjà d’être générée. Attendez une minute avant de recommencer.",
        },
        { status: 429 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "arboboard_export_entreprise_json",
      {
        p_entreprise_id: profil.entreprise_id,
      }
    );

    if (error) throw error;

    const exportEntreprise =
      (data || {}) as ExportEntreprise;

    const document = {
      avertissement:
        "Ce fichier contient des données professionnelles confidentielles. Conservez-le dans un emplacement sécurisé.",
      informations_sauvegarde: {
        genere_par_utilisateur_id: profil.id,
        genere_par_email: profil.email || null,
        format: "JSON",
      },
      ...exportEntreprise,
    };

    const contenu = JSON.stringify(document, null, 2);
    const tailleOctets = Buffer.byteLength(
      contenu,
      "utf8"
    );
    const empreinte = createHash("sha256")
      .update(contenu, "utf8")
      .digest("hex");

    const nombreTables =
      typeof exportEntreprise.nombre_tables === "number"
        ? exportEntreprise.nombre_tables
        : Object.keys(
            exportEntreprise.tables || {}
          ).length;

    const { data: historique, error: historiqueError } =
      await supabaseAdmin
        .from("sauvegardes_entreprise")
        .insert({
          entreprise_id: profil.entreprise_id,
          utilisateur_id: profil.id,
          type_sauvegarde: "export_manuel",
          format_fichier: "json",
          statut: "terminee",
          nombre_tables: nombreTables,
          taille_octets: tailleOctets,
          empreinte_sha256: empreinte,
        })
        .select("id, created_at")
        .single();

    if (historiqueError) throw historiqueError;

    await supabaseAdmin.rpc(
      "arboboard_ecrire_journal",
      {
        p_entreprise_id: profil.entreprise_id,
        p_action: "sauvegarde_entreprise_generee",
        p_categorie: "securite",
        p_ressource_type: "sauvegarde_entreprise",
        p_ressource_id: historique.id,
        p_resultat: "succes",
        p_description:
          "Génération d’un export logique des données de l’entreprise.",
        p_details: {
          format: "json",
          nombre_tables: nombreTables,
          taille_octets: tailleOctets,
          empreinte_sha256: empreinte,
        },
      }
    );

    const dateFichier = new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

    const nomFichier =
      `arboboard-sauvegarde-entreprise-${dateFichier}.json`;

    return new NextResponse(contenu, {
      status: 200,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Content-Disposition":
          `attachment; filename="${nomFichier}"`,
        "Cache-Control":
          "no-store, private, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Arboboard-Backup-Id": historique.id,
        "X-Arboboard-Backup-Sha256": empreinte,
      },
    });
  } catch (error) {
    console.error(
      "Erreur génération sauvegarde :",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Impossible de générer la sauvegarde.";

    try {
      await supabaseAdmin
        .from("sauvegardes_entreprise")
        .insert({
          entreprise_id: profil.entreprise_id,
          utilisateur_id: profil.id,
          type_sauvegarde: "export_manuel",
          format_fichier: "json",
          statut: "echec",
          nombre_tables: 0,
          taille_octets: 0,
          message_erreur: message.slice(0, 1000),
        });
    } catch (historiqueError) {
      console.error(
        "Impossible d’enregistrer l’échec de sauvegarde :",
        historiqueError
      );
    }

    return NextResponse.json(
      { erreur: message },
      { status: 500 }
    );
  }
}