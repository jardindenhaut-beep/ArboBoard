import {
  NextRequest,
  NextResponse,
} from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES_AUTORISES = new Set([
  "chef",
  "admin",
  "administrateur",
  "gerant",
  "dirigeant",
  "patron",
]);

const TYPES_AUTORISES = new Set([
  "tous",
  "cgu",
  "politique_confidentialite",
  "cgv",
]);

const CONTEXTES_AUTORISES = new Set([
  "tous",
  "inscription",
  "souscription",
]);

type ProfilUtilisateur = {
  id: string;
  email?: string | null;
  nom?: string | null;
  prenom?: string | null;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type AcceptationBrute = {
  id: string;
  utilisateur_id: string;
  entreprise_id?: string | null;
  type_document: string;
  version_document: string;
  titre_document: string;
  contexte: string;
  source: string;
  details?: Record<string, unknown> | null;
  user_agent?: string | null;
  acceptee_at: string;
};

function normaliser(
  valeur: string | null | undefined
) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function creerSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Configuration Supabase serveur incomplète."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function obtenirJeton(
  request: NextRequest
) {
  const autorisation =
    request.headers.get("authorization");

  if (
    !autorisation?.startsWith("Bearer ")
  ) {
    return null;
  }

  return (
    autorisation.slice(7).trim() ||
    null
  );
}

function lireEntier(
  valeur: string | null,
  valeurParDefaut: number,
  minimum: number,
  maximum: number
) {
  const nombre = Number.parseInt(
    valeur || "",
    10
  );

  if (!Number.isFinite(nombre)) {
    return valeurParDefaut;
  }

  return Math.min(
    maximum,
    Math.max(minimum, nombre)
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const jeton = obtenirJeton(request);

    if (!jeton) {
      return NextResponse.json(
        {
          erreur:
            "Authentification requise.",
        },
        { status: 401 }
      );
    }

    const supabaseAdmin =
      creerSupabaseAdmin();

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      jeton
    );

    if (userError || !user) {
      return NextResponse.json(
        {
          erreur:
            "Session invalide ou expirée.",
        },
        { status: 401 }
      );
    }

    const {
      data: profil,
      error: profilError,
    } = await supabaseAdmin
      .from("profils_utilisateurs")
      .select(
        "id, email, nom, prenom, role, statut, entreprise_id"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (
      profilError ||
      !profil?.entreprise_id
    ) {
      return NextResponse.json(
        {
          erreur:
            "Profil ou entreprise introuvable.",
        },
        { status: 403 }
      );
    }

    const profilType =
      profil as ProfilUtilisateur;

    if (
      !ROLES_AUTORISES.has(
        normaliser(profilType.role)
      ) ||
      (
        profilType.statut &&
        normaliser(profilType.statut) !==
          "actif"
      )
    ) {
      return NextResponse.json(
        {
          erreur:
            "Accès administrateur refusé.",
        },
        { status: 403 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const typeDocument = normaliser(
      searchParams.get("type_document")
    ) || "tous";

    const contexte = normaliser(
      searchParams.get("contexte")
    ) || "tous";

    const recherche = normaliser(
      searchParams.get("recherche")
    ).slice(0, 200);

    const limite = lireEntier(
      searchParams.get("limite"),
      100,
      1,
      500
    );

    if (
      !TYPES_AUTORISES.has(typeDocument)
    ) {
      return NextResponse.json(
        {
          erreur:
            "Filtre de document invalide.",
        },
        { status: 400 }
      );
    }

    if (
      !CONTEXTES_AUTORISES.has(contexte)
    ) {
      return NextResponse.json(
        {
          erreur:
            "Filtre de contexte invalide.",
        },
        { status: 400 }
      );
    }

    let requete = supabaseAdmin
      .from(
        "acceptations_contractuelles"
      )
      .select("*")
      .eq(
        "entreprise_id",
        profilType.entreprise_id
      )
      .order("acceptee_at", {
        ascending: false,
      })
      .limit(limite);

    if (typeDocument !== "tous") {
      requete = requete.eq(
        "type_document",
        typeDocument
      );
    }

    if (contexte !== "tous") {
      requete = requete.eq(
        "contexte",
        contexte
      );
    }

    const {
      data: acceptationsData,
      error: acceptationsError,
    } = await requete;

    if (acceptationsError) {
      throw acceptationsError;
    }

    const acceptations =
      (acceptationsData ||
        []) as AcceptationBrute[];

    const utilisateurIds = [
      ...new Set(
        acceptations.map(
          (acceptation) =>
            acceptation.utilisateur_id
        )
      ),
    ];

    const {
      data: profilsData,
      error: profilsError,
    } = utilisateurIds.length
      ? await supabaseAdmin
          .from(
            "profils_utilisateurs"
          )
          .select(
            "id, email, nom, prenom"
          )
          .in("id", utilisateurIds)
      : {
          data: [],
          error: null,
        };

    if (profilsError) {
      throw profilsError;
    }

    const profilsParId = new Map(
      (profilsData || []).map(
        (profilUtilisateur) => [
          profilUtilisateur.id,
          profilUtilisateur,
        ]
      )
    );

    const acceptationsEnrichies =
      acceptations
        .map((acceptation) => {
          const utilisateur =
            profilsParId.get(
              acceptation.utilisateur_id
            );

          const nomComplet = [
            utilisateur?.prenom,
            utilisateur?.nom,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();

          return {
            ...acceptation,
            utilisateur_email:
              utilisateur?.email || null,
            utilisateur_nom:
              nomComplet || null,
          };
        })
        .filter((acceptation) => {
          if (!recherche) return true;

          const contenu = normaliser(
            [
              acceptation.utilisateur_nom,
              acceptation.utilisateur_email,
              acceptation.titre_document,
              acceptation.type_document,
              acceptation.version_document,
              acceptation.contexte,
              acceptation.source,
              JSON.stringify(
                acceptation.details || {}
              ),
            ]
              .filter(Boolean)
              .join(" ")
          );

          return contenu.includes(
            recherche
          );
        });

    const statistiques = {
      total: acceptationsEnrichies.length,
      cgu: acceptationsEnrichies.filter(
        (element) =>
          element.type_document === "cgu"
      ).length,
      confidentialite:
        acceptationsEnrichies.filter(
          (element) =>
            element.type_document ===
            "politique_confidentialite"
        ).length,
      cgv: acceptationsEnrichies.filter(
        (element) =>
          element.type_document === "cgv"
      ).length,
    };

    return NextResponse.json({
      acceptations:
        acceptationsEnrichies,
      statistiques,
      limite,
    });
  } catch (error) {
    console.error(
      "Erreur lecture acceptations contractuelles :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de charger les acceptations contractuelles.",
      },
      { status: 500 }
    );
  }
}