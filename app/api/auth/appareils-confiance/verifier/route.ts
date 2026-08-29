import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  authentifierRequeteAppareil,
  calculerEmpreinteJeton,
  estClientMobile,
  lireJetonAppareil,
  messageErreurAppareil,
  statutErreurAppareil,
  supprimerCookieAppareil,
} from "@/lib/auth/appareilsConfianceServeur";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const ORIGINES_MOBILE_AUTORISEES =
  new Set([
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
    "https://localhost",
  ]);

function origineAutorisee(
  request: NextRequest
) {
  const origine =
    request.headers
      .get(
        "origin"
      )
      ?.trim() ||
    "";

  if (
    !origine
  ) {
    return null;
  }

  if (
    ORIGINES_MOBILE_AUTORISEES.has(
      origine
    )
  ) {
    return origine;
  }

  if (
    origine ===
      "https://arboboard.fr" ||
    origine ===
      "https://www.arboboard.fr"
  ) {
    return origine;
  }

  return null;
}

function ajouterCors(
  request: NextRequest,
  response: NextResponse
) {
  const origine =
    origineAutorisee(
      request
    );

  if (
    origine
  ) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      origine
    );

    response.headers.set(
      "Access-Control-Allow-Credentials",
      "true"
    );

    response.headers.set(
      "Vary",
      "Origin"
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
      "X-Arboboard-Device-Token",
    ].join(", ")
  );

  response.headers.set(
    "Access-Control-Max-Age",
    "86400"
  );

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}

function reponseJson(
  request: NextRequest,
  body: unknown,
  init?: ResponseInit
) {
  return ajouterCors(
    request,
    NextResponse.json(
      body,
      init
    )
  );
}

export async function OPTIONS(
  request: NextRequest
) {
  return ajouterCors(
    request,
    new NextResponse(
      null,
      {
        status: 204,
      }
    )
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const clientMobile =
      estClientMobile(
        request
      );

    const {
      supabaseAdmin,
      user,
    } =
      await authentifierRequeteAppareil(
        request
      );

    /*
     * Le helper lireJetonAppareil()
     * accepte maintenant :
     *
     * WEB
     * -> cookie HttpOnly
     *
     * MOBILE
     * -> X-Arboboard-Device-Token
     */
    const jetonAppareil =
      lireJetonAppareil(
        request
      );

    if (
      !jetonAppareil
    ) {
      return reponseJson(
        request,
        {
          confiance:
            false,

          raison:
            clientMobile
              ? "jeton_mobile_absent"
              : "cookie_absent",
        }
      );
    }

    const empreinte =
      calculerEmpreinteJeton(
        jetonAppareil
      );

    const {
      data:
        appareil,
      error,
    } =
      await supabaseAdmin
        .from(
          "appareils_confiance"
        )
        .select(
          `
            id,
            utilisateur_id,
            entreprise_id,
            role,
            nom_appareil,
            navigateur,
            systeme,
            expire_at,
            revoque_at,
            derniere_utilisation_at
          `
        )
        .eq(
          "utilisateur_id",
          user.id
        )
        .eq(
          "token_hash",
          empreinte
        )
        .maybeSingle();

    if (
      error
    ) {
      throw error;
    }

    /*
     * Jeton inconnu :
     * aucune confiance accordée.
     */
    if (
      !appareil
    ) {
      const response =
        reponseJson(
          request,
          {
            confiance:
              false,

            raison:
              "appareil_inconnu",
          }
        );

      /*
       * Sur le web, on supprime
       * l'ancien cookie devenu invalide.
       *
       * Sur mobile, le jeton sera supprimé
       * du stockage sécurisé par le client.
       */
      if (
        !clientMobile
      ) {
        supprimerCookieAppareil(
          response
        );
      }

      return response;
    }

    const maintenant =
      Date.now();

    const expiration =
      new Date(
        appareil.expire_at
      ).getTime();

    const expire =
      !Number.isFinite(
        expiration
      ) ||
      expiration <=
        maintenant;

    /*
     * Appareil révoqué ou expiré.
     */
    if (
      appareil.revoque_at ||
      expire
    ) {
      if (
        !appareil.revoque_at
      ) {
        const {
          error:
            revocationError,
        } =
          await supabaseAdmin
            .from(
              "appareils_confiance"
            )
            .update({
              revoque_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              appareil.id
            )
            .eq(
              "utilisateur_id",
              user.id
            );

        if (
          revocationError
        ) {
          throw revocationError;
        }
      }

      const response =
        reponseJson(
          request,
          {
            confiance:
              false,

            raison:
              appareil.revoque_at
                ? "appareil_revoque"
                : "appareil_expire",
          }
        );

      if (
        !clientMobile
      ) {
        supprimerCookieAppareil(
          response
        );
      }

      return response;
    }

    /*
     * L'appareil est valide.
     * On actualise uniquement sa dernière
     * utilisation, sans prolonger les 90 jours.
     */
    const {
      error:
        utilisationError,
    } =
      await supabaseAdmin
        .from(
          "appareils_confiance"
        )
        .update({
          derniere_utilisation_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          appareil.id
        )
        .eq(
          "utilisateur_id",
          user.id
        )
        .is(
          "revoque_at",
          null
        );

    if (
      utilisationError
    ) {
      throw utilisationError;
    }

    return reponseJson(
      request,
      {
        confiance:
          true,

        appareilId:
          appareil.id,

        nomAppareil:
          appareil.nom_appareil,

        navigateur:
          appareil.navigateur,

        systeme:
          appareil.systeme,

        expireAt:
          appareil.expire_at,

        client:
          clientMobile
            ? "mobile"
            : "web",
      }
    );
  } catch (
    error
  ) {
    return reponseJson(
      request,
      {
        confiance:
          false,

        erreur:
          messageErreurAppareil(
            error
          ),
      },
      {
        status:
          statutErreurAppareil(
            error
          ),
      }
    );
  }
}