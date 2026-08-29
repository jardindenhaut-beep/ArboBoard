import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  authentifierRequeteAppareil,
  calculerEmpreinteJeton,
  creerJetonAppareil,
  dateExpirationAppareil,
  decrireAppareil,
  definirCookieAppareil,
  estClientMobile,
  lireJetonAppareil,
  messageErreurAppareil,
  statutErreurAppareil,
  supprimerCookieAppareil,
  verifierSessionAal2,
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
    "GET, POST, DELETE, OPTIONS"
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

export async function GET(
  request: NextRequest
) {
  try {
    const {
      supabaseAdmin,
      user,
    } =
      await authentifierRequeteAppareil(
        request
      );

    const maintenant =
      new Date().toISOString();

    const {
      error:
        expirationError,
    } =
      await supabaseAdmin
        .from(
          "appareils_confiance"
        )
        .update({
          revoque_at:
            maintenant,
        })
        .eq(
          "utilisateur_id",
          user.id
        )
        .is(
          "revoque_at",
          null
        )
        .lte(
          "expire_at",
          maintenant
        );

    if (
      expirationError
    ) {
      throw expirationError;
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "appareils_confiance"
        )
        .select(
          `
            id,
            nom_appareil,
            navigateur,
            systeme,
            token_hash,
            created_at,
            derniere_utilisation_at,
            expire_at
          `
        )
        .eq(
          "utilisateur_id",
          user.id
        )
        .is(
          "revoque_at",
          null
        )
        .gt(
          "expire_at",
          maintenant
        )
        .order(
          "derniere_utilisation_at",
          {
            ascending:
              false,
          }
        );

    if (
      error
    ) {
      throw error;
    }

    const jetonActuel =
      lireJetonAppareil(
        request
      );

    const empreinteActuelle =
      jetonActuel
        ? calculerEmpreinteJeton(
            jetonActuel
          )
        : null;

    return reponseJson(
      request,
      {
        appareils:
          (
            data ||
            []
          ).map(
            (
              appareil
            ) => ({
              id:
                appareil.id,

              nom_appareil:
                appareil.nom_appareil,

              navigateur:
                appareil.navigateur,

              systeme:
                appareil.systeme,

              created_at:
                appareil.created_at,

              derniere_utilisation_at:
                appareil.derniere_utilisation_at,

              expire_at:
                appareil.expire_at,

              appareil_actuel:
                Boolean(
                  empreinteActuelle
                ) &&
                appareil.token_hash ===
                  empreinteActuelle,
            })
          ),
      }
    );
  } catch (
    error
  ) {
    return reponseJson(
      request,
      {
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
      profil,
      jeton,
    } =
      await authentifierRequeteAppareil(
        request
      );

    const sessionAal2 =
      await verifierSessionAal2(
        supabaseAdmin,
        jeton
      );

    if (
      !sessionAal2
    ) {
      return reponseJson(
        request,
        {
          erreur:
            "Le code de double authentification doit être validé avant d’enregistrer cet appareil.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * Si l'appareil appelant possède déjà
     * un jeton reconnu, on le révoque
     * avant d'en générer un nouveau.
     *
     * Sur le web :
     *   -> jeton lu dans le cookie HttpOnly.
     *
     * Sur mobile :
     *   -> jeton lu dans X-Arboboard-Device-Token.
     */
    const ancienJeton =
      lireJetonAppareil(
        request
      );

    if (
      ancienJeton
    ) {
      const {
        error:
          ancienneRevocationError,
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
            "utilisateur_id",
            user.id
          )
          .eq(
            "token_hash",
            calculerEmpreinteJeton(
              ancienJeton
            )
          )
          .is(
            "revoque_at",
            null
          );

      if (
        ancienneRevocationError
      ) {
        throw ancienneRevocationError;
      }
    }

    const jetonAppareil =
      creerJetonAppareil();

    const expireAt =
      dateExpirationAppareil();

    const description =
      decrireAppareil(
        request.headers.get(
          "user-agent"
        )
      );

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "appareils_confiance"
        )
        .insert({
          utilisateur_id:
            user.id,

          entreprise_id:
            profil.entreprise_id,

          role:
            profil.role ||
            "utilisateur",

          nom_appareil:
            clientMobile
              ? `Arboboard Mobile sur ${description.systeme}`
              : description.nomAppareil,

          navigateur:
            clientMobile
              ? "Arboboard Mobile"
              : description.navigateur,

          systeme:
            description.systeme,

          user_agent:
            description.userAgent,

          token_hash:
            calculerEmpreinteJeton(
              jetonAppareil
            ),

          expire_at:
            expireAt.toISOString(),
        })
        .select(
          `
            id,
            nom_appareil,
            navigateur,
            systeme,
            created_at,
            derniere_utilisation_at,
            expire_at
          `
        )
        .single();

    if (
      error
    ) {
      throw error;
    }

    /*
     * IMPORTANT :
     *
     * Le web ne reçoit jamais le secret
     * dans le JSON. Il reste uniquement
     * dans le cookie HttpOnly.
     *
     * Le mobile le reçoit une seule fois
     * juste après validation AAL2.
     * Il devra immédiatement le placer
     * dans le stockage sécurisé natif.
     */
    const corps =
      clientMobile
        ? {
            success:
              true,

            appareil: {
              ...data,

              appareil_actuel:
                true,
            },

            jeton_appareil:
              jetonAppareil,

            expire_at:
              expireAt.toISOString(),

            duree_jours:
              90,
          }
        : {
            success:
              true,

            appareil: {
              ...data,

              appareil_actuel:
                true,
            },
          };

    const response =
      reponseJson(
        request,
        corps
      );

    /*
     * On conserve aussi le cookie.
     * Cela maintient le fonctionnement
     * actuel du site web et permet une
     * compatibilité maximale.
     */
    definirCookieAppareil(
      response,
      jetonAppareil,
      expireAt
    );

    return response;
  } catch (
    error
  ) {
    return reponseJson(
      request,
      {
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

export async function DELETE(
  request: NextRequest
) {
  try {
    const {
      supabaseAdmin,
      user,
    } =
      await authentifierRequeteAppareil(
        request
      );

    const body =
      (
        await request
          .json()
          .catch(
            () => ({})
          )
      ) as {
        appareilId?:
          string;
      };

    const appareilId =
      String(
        body.appareilId ||
          ""
      ).trim();

    if (
      !appareilId
    ) {
      return reponseJson(
        request,
        {
          erreur:
            "Identifiant de l’appareil manquant.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      data:
        appareil,
      error:
        lectureError,
    } =
      await supabaseAdmin
        .from(
          "appareils_confiance"
        )
        .select(
          "id, token_hash"
        )
        .eq(
          "id",
          appareilId
        )
        .eq(
          "utilisateur_id",
          user.id
        )
        .is(
          "revoque_at",
          null
        )
        .maybeSingle();

    if (
      lectureError
    ) {
      throw lectureError;
    }

    if (
      !appareil
    ) {
      return reponseJson(
        request,
        {
          erreur:
            "Appareil introuvable ou déjà révoqué.",
        },
        {
          status:
            404,
        }
      );
    }

    const jetonActuel =
      lireJetonAppareil(
        request
      );

    const appareilActuel =
      Boolean(
        jetonActuel
      ) &&
      calculerEmpreinteJeton(
        jetonActuel as string
      ) ===
        appareil.token_hash;

    const {
      error,
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
      error
    ) {
      throw error;
    }

    const response =
      reponseJson(
        request,
        {
          success:
            true,

          appareil_actuel_revoque:
            appareilActuel,
        }
      );

    if (
      appareilActuel
    ) {
      supprimerCookieAppareil(
        response
      );
    }

    return response;
  } catch (
    error
  ) {
    return reponseJson(
      request,
      {
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