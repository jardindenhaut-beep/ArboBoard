import {
  NextRequest,
  NextResponse,
} from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  estTypeDocumentJuridique,
  TYPES_DOCUMENTS_JURIDIQUES,
  type DocumentJuridiquePlateforme,
} from "@/lib/documentsJuridiques";

type ProfilAdministrateur = {
  id: string;
  email?: string | null;
  role?: string | null;
  statut?: string | null;
  entreprise_id?: string | null;
};

type EntrepriseAdministrateur = {
  id: string;
  plan_abonnement?: string | null;
};

type CorpsModification = {
  type_document?: unknown;
  titre?: unknown;
  contenu?: unknown;
  version?: unknown;
};

type CorpsPublication = {
  type_document?: unknown;
};

const ROLES_AUTORISES = new Set([
  "chef",
  "admin",
  "administrateur",
  "gerant",
  "dirigeant",
  "patron",
]);

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

function obtenirEmailsDeveloppeurs() {
  return new Set(
    String(
      process.env
        .ARBOBOARD_DEVELOPER_EMAILS || ""
    )
      .split(",")
      .map((email) => normaliser(email))
      .filter(Boolean)
  );
}

async function authentifierAdministrateur(
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
      profil: null,
    };
  }

  const {
    data: profil,
    error: profilError,
  } = await supabaseAdmin
    .from("profils_utilisateurs")
    .select(
      "id, email, role, statut, entreprise_id"
    )
    .eq("id", user.id)
    .single();

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
      profil: null,
    };
  }

  const profilType =
    profil as ProfilAdministrateur;

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
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Accès administrateur refusé.",
        },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  const {
    data: entreprise,
    error: entrepriseError,
  } = await supabaseAdmin
    .from("entreprises_abonnees")
    .select("id, plan_abonnement")
    .eq(
      "id",
      profilType.entreprise_id
    )
    .single();

  if (
    entrepriseError ||
    !entreprise
  ) {
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "Entreprise introuvable.",
        },
        { status: 403 }
      ),
      supabaseAdmin: null,
      profil: null,
    };
  }

  const entrepriseType =
    entreprise as EntrepriseAdministrateur;

  const emailsDeveloppeurs =
    obtenirEmailsDeveloppeurs();

  const emailUtilisateur = normaliser(
    user.email || profilType.email
  );

  const autoriseParEmail =
    Boolean(emailUtilisateur) &&
    emailsDeveloppeurs.has(
      emailUtilisateur
    );

  const autoriseParPlan =
    normaliser(
      entrepriseType.plan_abonnement
    ) === "dev";

  if (
    !autoriseParEmail &&
    !autoriseParPlan
  ) {
    return {
      erreur: NextResponse.json(
        {
          erreur:
            "L’édition des documents de la plateforme est réservée au compte développeur.",
        },
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

export async function GET(
  request: NextRequest
) {
  try {
    const authentification =
      await authentifierAdministrateur(
        request
      );

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin
    ) {
      return authentification.erreur;
    }

    const { data, error } =
      await authentification
        .supabaseAdmin
        .from(
          "documents_juridiques_plateforme"
        )
        .select("id, type_document, titre_publie, contenu_publie, version_publiee, titre_brouillon, contenu_brouillon, version_brouillon, publie_at, publie_par, updated_by, created_at, updated_at")
        .in("type_document", [
          ...TYPES_DOCUMENTS_JURIDIQUES,
        ])
        .order("type_document");

    if (error) throw error;

    return NextResponse.json({
      documents:
        (data ||
          []) as DocumentJuridiquePlateforme[],
    });
  } catch (error) {
    console.error(
      "Erreur lecture documents juridiques :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          "Impossible de charger les documents.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest
) {
  try {
    const authentification =
      await authentifierAdministrateur(
        request
      );

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const {
      supabaseAdmin,
      profil,
    } = authentification;

    const corps =
      (await request.json()) as CorpsModification;

    if (
      !estTypeDocumentJuridique(
        corps.type_document
      )
    ) {
      return NextResponse.json(
        {
          erreur:
            "Type de document invalide.",
        },
        { status: 400 }
      );
    }

    const titre =
      typeof corps.titre === "string"
        ? corps.titre.trim()
        : "";

    const contenu =
      typeof corps.contenu === "string"
        ? corps.contenu.trim()
        : "";

    const version =
      typeof corps.version === "string"
        ? corps.version.trim()
        : "";

    if (
      titre.length < 3 ||
      titre.length > 150
    ) {
      return NextResponse.json(
        {
          erreur:
            "Le titre doit contenir entre 3 et 150 caractères.",
        },
        { status: 400 }
      );
    }

    if (
      !contenu ||
      contenu.length > 100000
    ) {
      return NextResponse.json(
        {
          erreur:
            "Le contenu est obligatoire et ne doit pas dépasser 100 000 caractères.",
        },
        { status: 400 }
      );
    }

    if (
      !version ||
      version.length > 50
    ) {
      return NextResponse.json(
        {
          erreur:
            "La version est obligatoire.",
        },
        { status: 400 }
      );
    }

    const { data, error } =
      await supabaseAdmin
        .from(
          "documents_juridiques_plateforme"
        )
        .update({
          titre_brouillon: titre,
          contenu_brouillon: contenu,
          version_brouillon: version,
          updated_by: profil.id,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "type_document",
          corps.type_document
        )
        .select("id, type_document, titre_publie, contenu_publie, version_publiee, titre_brouillon, contenu_brouillon, version_brouillon, publie_at, publie_par, updated_by, created_at, updated_at")
        .single();

    if (error) throw error;

    return NextResponse.json({
      succes: true,
      document:
        data as DocumentJuridiquePlateforme,
    });
  } catch (error) {
    console.error(
      "Erreur modification document juridique :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          "Impossible d’enregistrer le brouillon.",
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
      await authentifierAdministrateur(
        request
      );

    if (
      authentification.erreur ||
      !authentification.supabaseAdmin ||
      !authentification.profil
    ) {
      return authentification.erreur;
    }

    const {
      supabaseAdmin,
      profil,
    } = authentification;

    const corps =
      (await request.json()) as CorpsPublication;

    if (
      !estTypeDocumentJuridique(
        corps.type_document
      )
    ) {
      return NextResponse.json(
        {
          erreur:
            "Type de document invalide.",
        },
        { status: 400 }
      );
    }

    const { data, error } =
      await supabaseAdmin.rpc(
        "arboboard_publier_document_juridique",
        {
          p_type_document:
            corps.type_document,
          p_utilisateur_id: profil.id,
        }
      );

    if (error) throw error;

    return NextResponse.json({
      succes: true,
      document:
        data as DocumentJuridiquePlateforme,
    });
  } catch (error) {
    console.error(
      "Erreur publication document juridique :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          "Impossible de publier le document.",
      },
      { status: 500 }
    );
  }
}