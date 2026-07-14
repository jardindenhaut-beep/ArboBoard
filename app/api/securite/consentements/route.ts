import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VERSION_CONSENTEMENTS = "2026-07-14-v1";

const TYPES_CONSENTEMENT = [
  "communications_produit",
  "prospection_commerciale",
  "statistiques_optionnelles",
] as const;

type TypeConsentement =
  (typeof TYPES_CONSENTEMENT)[number];

type ProfilConsentement = {
  id: string;
  entreprise_id?: string | null;
  statut?: string | null;
};

type CorpsConsentement = {
  type_consentement?: unknown;
  accorde?: unknown;
  version_document?: unknown;
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

function normaliserStatut(statut: string | null | undefined) {
  return String(statut || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function estTypeConsentement(
  valeur: unknown
): valeur is TypeConsentement {
  return (
    typeof valeur === "string" &&
    TYPES_CONSENTEMENT.includes(
      valeur as TypeConsentement
    )
  );
}

function empreinte(valeur: string | null) {
  if (!valeur?.trim()) return null;

  return createHash("sha256")
    .update(valeur.trim())
    .digest("hex");
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
      .select("id, entreprise_id, statut")
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

  const profilType = profil as ProfilConsentement;

  if (
    profilType.statut &&
    normaliserStatut(profilType.statut) !== "actif"
  ) {
    return {
      erreur: NextResponse.json(
        { erreur: "Compte utilisateur inactif." },
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

    const [
      consentementsResultat,
      historiqueResultat,
    ] = await Promise.all([
      supabaseAdmin
        .from("consentements_utilisateurs")
        .select(
          "id, type_consentement, accorde, version_document, source, accorde_at, retire_at, updated_at"
        )
        .eq("utilisateur_id", profil.id)
        .eq("entreprise_id", profil.entreprise_id),
      supabaseAdmin
        .from("consentements_historique")
        .select(
          "id, type_consentement, accorde, version_document, source, created_at"
        )
        .eq("utilisateur_id", profil.id)
        .eq("entreprise_id", profil.entreprise_id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (consentementsResultat.error) {
      throw consentementsResultat.error;
    }

    if (historiqueResultat.error) {
      throw historiqueResultat.error;
    }

    return NextResponse.json({
      version_document: VERSION_CONSENTEMENTS,
      consentements: consentementsResultat.data || [],
      historique: historiqueResultat.data || [],
    });
  } catch (error) {
    console.error(
      "Erreur lecture des consentements :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger les consentements.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const corps =
      (await request.json()) as CorpsConsentement;

    if (!estTypeConsentement(corps.type_consentement)) {
      return NextResponse.json(
        { erreur: "Type de consentement invalide." },
        { status: 400 }
      );
    }

    if (typeof corps.accorde !== "boolean") {
      return NextResponse.json(
        { erreur: "Le choix de consentement est invalide." },
        { status: 400 }
      );
    }

    const versionDocument =
      typeof corps.version_document === "string" &&
      corps.version_document.trim()
        ? corps.version_document.trim().slice(0, 100)
        : VERSION_CONSENTEMENTS;

    if (versionDocument !== VERSION_CONSENTEMENTS) {
      return NextResponse.json(
        {
          erreur:
            "La version du texte de consentement n’est plus actuelle. Actualisez la page.",
        },
        { status: 409 }
      );
    }

    const ipBrute =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip");

    const userAgent =
      request.headers.get("user-agent");

    const { data, error } = await supabaseAdmin.rpc(
      "arboboard_enregistrer_consentement",
      {
        p_entreprise_id: profil.entreprise_id,
        p_utilisateur_id: profil.id,
        p_type_consentement: corps.type_consentement,
        p_accorde: corps.accorde,
        p_version_document: VERSION_CONSENTEMENTS,
        p_source: "espace_compte",
        p_ip_hash: empreinte(ipBrute),
        p_user_agent_hash: empreinte(userAgent),
      }
    );

    if (error) throw error;

    return NextResponse.json({
      succes: true,
      consentement: data,
    });
  } catch (error) {
    console.error(
      "Erreur enregistrement du consentement :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer le consentement.",
      },
      { status: 500 }
    );
  }
}