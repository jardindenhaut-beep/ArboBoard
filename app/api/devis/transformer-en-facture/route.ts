import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const runtime =
  "nodejs";

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

function lireVariableEnv(
  nom:
    string
) {
  const valeur =
    process.env[nom];

  if (
    !valeur
  ) {
    throw new Error(
      `Variable d'environnement manquante : ${nom}`
    );
  }

  return valeur;
}

function creerSupabaseAdmin():
  any {
  return createClient(
    lireVariableEnv(
      "NEXT_PUBLIC_SUPABASE_URL"
    ),
    lireVariableEnv(
      "SUPABASE_SERVICE_ROLE_KEY"
    ),
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    }
  ) as any;
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
        "Session expirée. Veuillez vous reconnecter.",
        401
      );
    }

    const body =
      await request
        .json()
        .catch(
          () =>
            null
        );

    const devisId =
      String(
        body?.devisId ||
          ""
      ).trim();

    if (
      !devisId
    ) {
      return reponseErreur(
        request,
        "Identifiant du devis manquant.",
        400
      );
    }

    const supabaseAdmin =
      creerSupabaseAdmin();

    const {
      data:
        userData,
      error:
        userError,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (
      userError ||
      !userData?.user?.id
    ) {
      return reponseErreur(
        request,
        "Session invalide. Veuillez vous reconnecter.",
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
          "entreprise_id, role, statut"
        )
        .eq(
          "id",
          userData.user.id
        )
        .maybeSingle();

    if (
      profilError
    ) {
      console.error(
        "Erreur profil :",
        profilError
      );

      return reponseErreur(
        request,
        "Impossible de vérifier votre profil.",
        500
      );
    }

    if (
      !profil?.entreprise_id
    ) {
      return reponseErreur(
        request,
        "Entreprise introuvable pour ce compte.",
        403
      );
    }

    if (
      profil.role !==
        "chef" ||
      profil.statut !==
        "actif"
    ) {
      return reponseErreur(
        request,
        "Accès refusé.",
        403
      );
    }

    const {
      data:
        resultat,
      error:
        rpcError,
    } =
      await supabaseAdmin.rpc(
        "transformer_devis_en_facture",
        {
          p_entreprise_id:
            profil.entreprise_id,

          p_devis_id:
            devisId,
        }
      );

    if (
      rpcError
    ) {
      console.error(
        "Erreur transformation devis en facture :",
        rpcError
      );

      return reponseErreur(
        request,
        rpcError.message ||
          rpcError.details ||
          rpcError.hint ||
          "Impossible de transformer le devis en facture.",
        400
      );
    }

    const factureCreee =
      Array.isArray(
        resultat
      )
        ? resultat[0]
        : resultat;

    if (
      !factureCreee?.facture_id
    ) {
      return reponseErreur(
        request,
        "La facture n’a pas pu être créée.",
        500
      );
    }

    return reponseJson(
      request,
      {
        success:
          true,

        factureId:
          factureCreee.facture_id,

        numero:
          factureCreee.numero,

        message:
          `Facture ${
            factureCreee.numero ||
            ""
          } créée avec succès.`,
      },
      200
    );
  } catch (
    error
  ) {
    console.error(
      "Erreur API transformer devis en facture :",
      error
    );

    return reponseErreur(
      request,
      "Erreur serveur lors de la transformation.",
      500
    );
  }
}