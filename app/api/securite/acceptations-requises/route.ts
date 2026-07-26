import {
  NextRequest,
  NextResponse,
} from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES_OBLIGATOIRES = new Set([
  "cgu",
  "politique_confidentialite",
]);

type TypeObligatoire =
  | "cgu"
  | "politique_confidentialite";

type ProfilUtilisateur = {
  id: string;
  entreprise_id?: string | null;
  statut?: string | null;
};

type CorpsAcceptation = {
  type_document?: unknown;
  version_document?: unknown;
};

function creerSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function normaliser(
  valeur: string | null | undefined
) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

async function authentifier(
  request: NextRequest
) {
  const jeton = obtenirJeton(request);

  if (!jeton) {
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Authentification requise.",
        },
        { status: 401 }
      ),
      supabaseAdmin: null,
      user: null,
      profil: null,
    };
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
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Session invalide ou expirée.",
        },
        { status: 401 }
      ),
      supabaseAdmin: null,
      user: null,
      profil: null,
    };
  }

  const {
    data: profil,
    error: profilError,
  } = await supabaseAdmin
    .from("profils_utilisateurs")
    .select(
      "id, entreprise_id, statut"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profilError ||
    !profil?.entreprise_id
  ) {
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Profil ou entreprise introuvable.",
        },
        { status: 403 }
      ),
      supabaseAdmin: null,
      user: null,
      profil: null,
    };
  }

  const profilType =
    profil as ProfilUtilisateur;

  if (
    profilType.statut &&
    normaliser(profilType.statut) !==
      "actif"
  ) {
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Compte utilisateur inactif.",
        },
        { status: 403 }
      ),
      supabaseAdmin: null,
      user: null,
      profil: null,
    };
  }

  return {
    erreur: null,
    supabaseAdmin,
    user,
    profil: profilType,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const authentification =
      await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.user ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const {
      supabaseAdmin,
      user,
      profil,
    } = authentification;

    const [
      documentsResultat,
      acceptationsResultat,
    ] = await Promise.all([
      supabaseAdmin
        .from(
          "documents_juridiques_plateforme"
        )
        .select(
          "type_document, titre_publie, version_publie, publie_at"
        )
        .in("type_document", [
          "cgu",
          "politique_confidentialite",
        ])
        .not(
          "version_publie",
          "is",
          null
        )
        .not("publie_at", "is", null),

      supabaseAdmin
        .from(
          "acceptations_contractuelles"
        )
        .select(
          "type_document, version_document"
        )
        .eq("utilisateur_id", user.id)
        .eq(
          "entreprise_id",
          profil.entreprise_id
        )
        .in("type_document", [
          "cgu",
          "politique_confidentialite",
        ]),
    ]);

    if (documentsResultat.error) {
      throw documentsResultat.error;
    }

    if (acceptationsResultat.error) {
      throw acceptationsResultat.error;
    }

    const acceptations = new Set(
      (acceptationsResultat.data || []).map(
        (acceptation) =>
          `${acceptation.type_document}:${acceptation.version_document}`
      )
    );

    const documentsRequis =
      (documentsResultat.data || [])
        .filter(
          (document) =>
            document.type_document &&
            document.version_publie &&
            document.titre_publie &&
            !acceptations.has(
              `${document.type_document}:${document.version_publie}`
            )
        )
        .map((document) => ({
          type_document:
            document.type_document,
          titre:
            document.titre_publie,
          version:
            document.version_publie,
          publie_at:
            document.publie_at,
          chemin_public:
            document.type_document ===
            "cgu"
              ? "/cgu"
              : "/politique-confidentialite",
        }));

    return NextResponse.json({
      acceptation_requise:
        documentsRequis.length > 0,
      documents: documentsRequis,
    });
  } catch (error) {
    console.error(
      "Erreur vérification acceptations requises :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible de vérifier les documents à accepter.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const authentification =
      await authentifier(request);

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.user ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const {
      supabaseAdmin,
      user,
      profil,
    } = authentification;

    const corps =
      (await request.json()) as CorpsAcceptation;

    const typeDocument = normaliser(
      typeof corps.type_document ===
        "string"
        ? corps.type_document
        : ""
    );

    const versionDocument =
      typeof corps.version_document ===
      "string"
        ? corps.version_document.trim()
        : "";

    if (
      !TYPES_OBLIGATOIRES.has(
        typeDocument
      ) ||
      !versionDocument
    ) {
      return NextResponse.json(
        {
          erreur:
            "Document ou version invalide.",
        },
        { status: 400 }
      );
    }

    const {
      data: document,
      error: documentError,
    } = await supabaseAdmin
      .from(
        "documents_juridiques_plateforme"
      )
      .select(
        "type_document, titre_publie, version_publie, publie_at"
      )
      .eq(
        "type_document",
        typeDocument
      )
      .maybeSingle();

    if (
      documentError ||
      !document?.titre_publie ||
      !document?.version_publie ||
      !document?.publie_at
    ) {
      return NextResponse.json(
        {
          erreur:
            "Le document publié est introuvable.",
        },
        { status: 404 }
      );
    }

    if (
      document.version_publie !==
      versionDocument
    ) {
      return NextResponse.json(
        {
          erreur:
            "Une nouvelle version du document est disponible. Actualisez la page.",
        },
        { status: 409 }
      );
    }

    const {
      data: existante,
      error: existanteError,
    } = await supabaseAdmin
      .from(
        "acceptations_contractuelles"
      )
      .select("id")
      .eq("utilisateur_id", user.id)
      .eq(
        "entreprise_id",
        profil.entreprise_id
      )
      .eq(
        "type_document",
        typeDocument
      )
      .eq(
        "version_document",
        versionDocument
      )
      .maybeSingle();

    if (existanteError) {
      throw existanteError;
    }

    if (!existante) {
      const {
        error: insertionError,
      } = await supabaseAdmin
        .from(
          "acceptations_contractuelles"
        )
        .insert({
          utilisateur_id: user.id,
          entreprise_id:
            profil.entreprise_id,
          type_document:
            typeDocument as TypeObligatoire,
          version_document:
            versionDocument,
          titre_document:
            document.titre_publie,
          contexte: "mise_a_jour",
          source:
            "fenetre_acceptation_obligatoire",
          details: {
            publie_at:
              document.publie_at,
          },
          user_agent:
            request.headers
              .get("user-agent")
              ?.slice(0, 500) ||
            null,
        });

      if (insertionError) {
        throw insertionError;
      }
    }

    return NextResponse.json({
      succes: true,
      type_document: typeDocument,
      version_document:
        versionDocument,
    });
  } catch (error) {
    console.error(
      "Erreur acceptation nouvelle version :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer l’acceptation.",
      },
      { status: 500 }
    );
  }
}