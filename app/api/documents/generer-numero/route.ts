import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type TypeDocument =
  | "devis"
  | "facture"
  | "avoir";

const ORIGINES_AUTORISEES =
  new Set([
    "https://arboboard.fr",
    "https://www.arboboard.fr",
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
    "https://localhost",
  ]);

function origineAutorisee(
  origine:
    string | null
) {
  if (
    !origine
  ) {
    return null;
  }

  if (
    ORIGINES_AUTORISEES.has(
      origine
    )
  ) {
    return origine;
  }

  if (
    /^https?:\/\/localhost(?::\d+)?$/i.test(
      origine
    )
  ) {
    return origine;
  }

  if (
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(
      origine
    )
  ) {
    return origine;
  }

  return null;
}

function appliquerCors(
  request:
    NextRequest,
  response:
    NextResponse
) {
  const origine =
    origineAutorisee(
      request.headers.get(
        "origin"
      )
    );

  if (
    origine
  ) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      origine
    );
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  response.headers.set(
    "Access-Control-Allow-Headers",
    [
      "Authorization",
      "Content-Type",
      "X-Arboboard-Client",
    ].join(", ")
  );

  response.headers.set(
    "Access-Control-Max-Age",
    "86400"
  );

  response.headers.set(
    "Vary",
    "Origin"
  );

  return response;
}

function reponseJson(
  request:
    NextRequest,
  donnees:
    Record<
      string,
      unknown
    >,
  status =
    200
) {
  return appliquerCors(
    request,
    NextResponse.json(
      donnees,
      {
        status,
      }
    )
  );
}

function reponseErreur(
  request:
    NextRequest,
  message:
    string,
  status =
    400
) {
  return reponseJson(
    request,
    {
      success:
        false,

      error:
        message,
    },
    status
  );
}

function creerSupabaseAdmin() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Configuration Supabase serveur manquante."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    }
  );
}

export async function OPTIONS(
  request:
    NextRequest
) {
  return appliquerCors(
    request,
    new NextResponse(
      null,
      {
        status:
          204,
      }
    )
  );
}

export async function POST(
  request:
    NextRequest
) {
  try {
    const supabaseAdmin =
      creerSupabaseAdmin();

    const authorization =
      request.headers.get(
        "authorization"
      ) ||
      "";

    const token =
      authorization.startsWith(
        "Bearer "
      )
        ? authorization
            .slice(7)
            .trim()
        : "";

    if (
      !token
    ) {
      return reponseErreur(
        request,
        "Token d’authentification manquant.",
        401
      );
    }

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (
      userError ||
      !user?.id
    ) {
      return reponseErreur(
        request,
        "Utilisateur non connecté.",
        401
      );
    }

    const {
      data:
        profil,
      error:
        profilError,
    } =
      await supabaseAdmin
        .from(
          "profils_utilisateurs"
        )
        .select(
          "id, entreprise_id, role, statut"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (
      profilError ||
      !profil
    ) {
      console.error(
        "Erreur lecture profil pour génération de numéro :",
        profilError
      );

      return reponseErreur(
        request,
        "Profil utilisateur introuvable.",
        403
      );
    }

    if (
      profil.role !==
        "chef" ||
      profil.statut !==
        "actif" ||
      !profil.entreprise_id
    ) {
      return reponseErreur(
        request,
        "Accès refusé. Seul le chef actif peut générer un numéro de document.",
        403
      );
    }

    const body =
      (
        await request
          .json()
          .catch(
            () => ({})
          )
      ) as {
        typeDocument?:
          TypeDocument |
          string;

        type_document?:
          TypeDocument |
          string;
      };

    const typeDocument =
      String(
        body.typeDocument ||
          body.type_document ||
          ""
      ).trim() as
        TypeDocument;

    if (
      ![
        "devis",
        "facture",
        "avoir",
      ].includes(
        typeDocument
      )
    ) {
      return reponseErreur(
        request,
        "Type de document invalide.",
        400
      );
    }

    const {
      data:
        numero,
      error:
        rpcError,
    } =
      await supabaseAdmin.rpc(
        "generer_numero_document",
        {
          p_entreprise_id:
            profil.entreprise_id,

          p_type_document:
            typeDocument,
        }
      );

    if (
      rpcError
    ) {
      console.error(
        "Erreur RPC génération numéro document :",
        rpcError
      );

      return reponseErreur(
        request,
        "Impossible de générer le numéro du document.",
        500
      );
    }

    if (
      !numero
    ) {
      return reponseErreur(
        request,
        "Impossible de générer le numéro du document.",
        500
      );
    }

    return reponseJson(
      request,
      {
        success:
          true,

        typeDocument,

        numero,
      },
      200
    );
  } catch (
    error
  ) {
    console.error(
      "Erreur génération numéro document :",
      error
    );

    return reponseErreur(
      request,
      "Une erreur est survenue pendant la génération du numéro.",
      500
    );
  }
}