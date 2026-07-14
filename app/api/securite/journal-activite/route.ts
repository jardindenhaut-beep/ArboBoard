import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ResultatJournal = "succes" | "echec" | "information";

type CorpsJournal = {
  action?: unknown;
  categorie?: unknown;
  ressource_type?: unknown;
  ressource_id?: unknown;
  resultat?: unknown;
  description?: unknown;
  details?: unknown;
};

type ProfilJournal = {
  id: string;
  email?: string | null;
  nom?: string | null;
  prenom?: string | null;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

const ROLES_CHEF = new Set([
  "chef",
  "admin",
  "administrateur",
  "gerant",
  "dirigeant",
  "patron",
]);

function normaliserRole(role: string | null | undefined) {
  return String(role || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function texteLimite(
  valeur: unknown,
  longueurMaximale: number
): string | null {
  if (typeof valeur !== "string") return null;

  const texte = valeur.trim();

  if (!texte) return null;

  return texte.slice(0, longueurMaximale);
}

function resultatValide(valeur: unknown): ResultatJournal {
  if (
    valeur === "echec" ||
    valeur === "information" ||
    valeur === "succes"
  ) {
    return valeur;
  }

  return "succes";
}

function obtenirJeton(request: NextRequest) {
  const autorisation = request.headers.get("authorization");

  if (!autorisation?.startsWith("Bearer ")) {
    return null;
  }

  return autorisation.slice(7).trim() || null;
}

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

  const { data: profil, error: profilError } = await supabaseAdmin
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

  const profilType = profil as ProfilJournal;

  if (
    profilType.statut &&
    normaliserRole(profilType.statut) !== "actif"
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

function nettoyerDetails(valeur: unknown) {
  if (
    !valeur ||
    typeof valeur !== "object" ||
    Array.isArray(valeur)
  ) {
    return {};
  }

  try {
    const serialise = JSON.stringify(valeur);

    if (serialise.length > 8000) {
      return {
        avertissement:
          "Les détails ont été supprimés car ils dépassaient la taille autorisée.",
      };
    }

    return JSON.parse(serialise) as Record<string, unknown>;
  } catch {
    return {};
  }
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

    if (!ROLES_CHEF.has(normaliserRole(profil.role))) {
      return NextResponse.json(
        { erreur: "Accès réservé au chef d’entreprise." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const limiteDemandee = Number(searchParams.get("limite") || 50);
    const limite = Math.min(
      Math.max(
        Number.isFinite(limiteDemandee) ? limiteDemandee : 50,
        1
      ),
      100
    );

    const categorie = texteLimite(
      searchParams.get("categorie"),
      50
    );
    const resultat = texteLimite(
      searchParams.get("resultat"),
      20
    );

    let requete = supabaseAdmin
      .from("journal_activite")
      .select(
        "id, utilisateur_id, utilisateur_email, utilisateur_nom, action, categorie, ressource_type, ressource_id, resultat, description, details, created_at"
      )
      .eq("entreprise_id", profil.entreprise_id)
      .order("created_at", { ascending: false })
      .limit(limite);

    if (categorie && categorie !== "toutes") {
      requete = requete.eq("categorie", categorie);
    }

    if (
      resultat &&
      ["succes", "echec", "information"].includes(resultat)
    ) {
      requete = requete.eq("resultat", resultat);
    }

    const { data, error } = await requete;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      evenements: data || [],
      retention_jours: 365,
    });
  } catch (error) {
    console.error("Erreur lecture journal d’activité :", error);

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger le journal d’activité.",
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
    const corps = (await request.json()) as CorpsJournal;

    const action = texteLimite(corps.action, 100);
    const categorie =
      texteLimite(corps.categorie, 50) || "systeme";

    if (!action || action.length < 2) {
      return NextResponse.json(
        { erreur: "L’action du journal est obligatoire." },
        { status: 400 }
      );
    }

    const nomUtilisateur =
      `${profil.prenom || ""} ${profil.nom || ""}`.trim() ||
      profil.email ||
      "Utilisateur Arboboard";

    const payload = {
      entreprise_id: profil.entreprise_id,
      utilisateur_id: profil.id,
      utilisateur_email: profil.email || null,
      utilisateur_nom: nomUtilisateur,
      action,
      categorie,
      ressource_type: texteLimite(
        corps.ressource_type,
        80
      ),
      ressource_id: texteLimite(corps.ressource_id, 150),
      resultat: resultatValide(corps.resultat),
      description: texteLimite(corps.description, 500),
      details: nettoyerDetails(corps.details),
    };

    const { data, error } = await supabaseAdmin
      .from("journal_activite")
      .insert(payload)
      .select("id, created_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        succes: true,
        evenement: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur écriture journal d’activité :", error);

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer l’événement.",
      },
      { status: 500 }
    );
  }
}
