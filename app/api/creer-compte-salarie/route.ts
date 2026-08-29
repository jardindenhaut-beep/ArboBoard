import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  entetesLimiteRequetes,
  obtenirAdresseIp,
  verifierLimiteRequetes,
} from "@/lib/securite/limiteurRequetes";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type BodyCreationSalarie = {
  salarieId?: string;

  email:
    string;

  nom:
    string;

  prenom:
    string;

  telephone?: string;
};

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
    Request,
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
    "Access-Control-Expose-Headers",
    [
      "Retry-After",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Content-Type",
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
    Request,
  donnees:
    Record<
      string,
      unknown
    >,
  status =
    200,
  headers?:
    HeadersInit
) {
  return appliquerCors(
    request,
    NextResponse.json(
      donnees,
      {
        status,
        headers,
      }
    )
  );
}

function limiteUtilisateursSelonPlan(
  plan:
    string
) {
  if (
    plan ===
    "dev"
  ) {
    return 999;
  }

  if (
    plan ===
    "expert"
  ) {
    return 10;
  }

  if (
    plan ===
    "pro"
  ) {
    return 3;
  }

  if (
    plan ===
    "essentiel"
  ) {
    return 1;
  }

  if (
    plan ===
    "essai"
  ) {
    return 3;
  }

  return 1;
}

function planAutoriseSalaries(
  plan:
    string
) {
  return [
    "pro",
    "expert",
    "dev",
    "essai",
  ].includes(
    plan
  );
}

function normaliserTelephone(
  valeur:
    string | undefined
) {
  const brut =
    String(
      valeur ||
        ""
    ).trim();

  if (
    !brut
  ) {
    return null;
  }

  let numero =
    brut.replace(
      /[()\s.-]/g,
      ""
    );

  if (
    numero.startsWith(
      "00"
    )
  ) {
    numero =
      `+${numero.slice(
        2
      )}`;
  }

  if (
    /^0[67]\d{8}$/.test(
      numero
    )
  ) {
    numero =
      `+33${numero.slice(
        1
      )}`;
  } else if (
    /^33[67]\d{8}$/.test(
      numero
    )
  ) {
    numero =
      `+${numero}`;
  }

  if (
    !/^\+[1-9]\d{7,14}$/.test(
      numero
    )
  ) {
    throw new Error(
      "Le numéro de téléphone n’est pas valide. Utilisez par exemple 06 12 34 56 78."
    );
  }

  return numero;
}

function urlSiteWeb() {
  const brut =
    String(
      process.env
        .NEXT_PUBLIC_SITE_URL ||
        "https://arboboard.fr"
    )
      .trim()
      .replace(
        /\/+$/,
        ""
      );

  try {
    const url =
      new URL(
        brut
      );

    if (
      url.protocol !==
        "https:" &&
      url.protocol !==
        "http:"
    ) {
      return "https://arboboard.fr";
    }

    return url.origin;
  } catch {
    return "https://arboboard.fr";
  }
}

export async function OPTIONS(
  request:
    Request
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
    Request
) {
  const ip =
    obtenirAdresseIp(
      request
    );

  const limiteIp =
    verifierLimiteRequetes({
      cle:
        `creation-salarie:ip:${ip}`,

      limite:
        30,

      fenetreMs:
        15 *
        60 *
        1000,
    });

  if (
    !limiteIp.autorise
  ) {
    return reponseJson(
      request,
      {
        error:
          "Trop de tentatives de création d’accès salarié. Réessaie dans quelques minutes.",
      },
      429,
      entetesLimiteRequetes(
        limiteIp
      )
    );
  }

  try {
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
      return reponseJson(
        request,
        {
          error:
            "Configuration Supabase manquante. Vérifiez les variables serveur.",
        },
        500
      );
    }

    const authHeader =
      request.headers.get(
        "authorization"
      );

    if (
      !authHeader?.startsWith(
        "Bearer "
      )
    ) {
      return reponseJson(
        request,
        {
          error:
            "Utilisateur non authentifié.",
        },
        401
      );
    }

    const token =
      authHeader
        .slice(
          7
        )
        .trim();

    if (
      !token
    ) {
      return reponseJson(
        request,
        {
          error:
            "Utilisateur non authentifié.",
        },
        401
      );
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,

            persistSession:
              false,
          },
        }
      );

    const {
      data: {
        user,
      },
      error:
        erreurUtilisateur,
    } =
      await supabaseAdmin
        .auth
        .getUser(
          token
        );

    if (
      erreurUtilisateur ||
      !user
    ) {
      return reponseJson(
        request,
        {
          error:
            "Session chef invalide. Reconnectez-vous.",
        },
        401
      );
    }

    const limiteChef =
      verifierLimiteRequetes({
        cle:
          `creation-salarie:chef:${user.id}`,

        limite:
          12,

        fenetreMs:
          60 *
          60 *
          1000,
      });

    if (
      !limiteChef.autorise
    ) {
      return reponseJson(
        request,
        {
          error:
            "Trop de créations ou d’invitations ont été demandées. Réessaie plus tard.",
        },
        429,
        entetesLimiteRequetes(
          limiteChef
        )
      );
    }

    const {
      data:
        profilChef,
      error:
        erreurProfilChef,
    } =
      await supabaseAdmin
        .from(
          "profils_utilisateurs"
        )
        .select(
          "id, email, role, statut, entreprise_id"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (
      erreurProfilChef ||
      !profilChef
    ) {
      return reponseJson(
        request,
        {
          error:
            "Profil chef introuvable.",
        },
        403
      );
    }

    if (
      profilChef.role !==
        "chef" ||
      (
        profilChef.statut &&
        profilChef.statut !==
          "actif"
      )
    ) {
      return reponseJson(
        request,
        {
          error:
            "Seul un compte chef actif peut créer un accès salarié.",
        },
        403
      );
    }

    if (
      !profilChef.entreprise_id
    ) {
      return reponseJson(
        request,
        {
          error:
            "Aucune entreprise rattachée au compte chef.",
        },
        400
      );
    }

    const {
      data:
        entreprise,
      error:
        erreurEntreprise,
    } =
      await supabaseAdmin
        .from(
          "entreprises_abonnees"
        )
        .select(
          "id, nom_entreprise, plan_abonnement, statut_abonnement"
        )
        .eq(
          "id",
          profilChef.entreprise_id
        )
        .maybeSingle();

    if (
      erreurEntreprise ||
      !entreprise
    ) {
      return reponseJson(
        request,
        {
          error:
            "Entreprise introuvable.",
        },
        404
      );
    }

    const plan =
      entreprise
        .plan_abonnement ||
      "essai";

    const statut =
      entreprise
        .statut_abonnement ||
      "essai";

    if (
      [
        "suspendu",
        "annule",
        "annulé",
      ].includes(
        statut
      )
    ) {
      return reponseJson(
        request,
        {
          error:
            "L’abonnement de l’entreprise est suspendu ou annulé.",
        },
        403
      );
    }

    if (
      !planAutoriseSalaries(
        plan
      )
    ) {
      return reponseJson(
        request,
        {
          error:
            "Votre plan actuel ne permet pas de créer des accès salariés.",
        },
        403
      );
    }

    const limiteUtilisateurs =
      limiteUtilisateursSelonPlan(
        plan
      );

    const {
      count:
        nombreUtilisateurs,
      error:
        erreurComptage,
    } =
      await supabaseAdmin
        .from(
          "profils_utilisateurs"
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "entreprise_id",
          profilChef.entreprise_id
        )
        .eq(
          "statut",
          "actif"
        );

    if (
      erreurComptage
    ) {
      console.error(
        "Erreur comptage utilisateurs actifs :",
        erreurComptage
      );

      return reponseJson(
        request,
        {
          error:
            "Impossible de vérifier le nombre d’utilisateurs actifs.",
        },
        500
      );
    }

    const body =
      (
        await request.json()
      ) as BodyCreationSalarie;

    const email =
      body.email
        ?.trim()
        .toLowerCase();

    const nom =
      body.nom
        ?.trim() ||
      "";

    const prenom =
      body.prenom
        ?.trim() ||
      "";

    let telephone:
      string | null =
        null;

    try {
      telephone =
        normaliserTelephone(
          body.telephone
        );
    } catch (
      error
    ) {
      return reponseJson(
        request,
        {
          error:
            error instanceof
            Error
              ? error.message
              : "Numéro de téléphone invalide.",
        },
        400
      );
    }

    if (
      !email
    ) {
      return reponseJson(
        request,
        {
          error:
            "L’email du salarié est obligatoire.",
        },
        400
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return reponseJson(
        request,
        {
          error:
            "L’adresse email du salarié n’est pas valide.",
        },
        400
      );
    }

    if (
      !nom &&
      !prenom
    ) {
      return reponseJson(
        request,
        {
          error:
            "Le nom ou le prénom du salarié est obligatoire.",
        },
        400
      );
    }

    const {
      data:
        listeUtilisateurs,
      error:
        listeError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .listUsers();

    if (
      listeError
    ) {
      console.error(
        "Erreur vérification comptes utilisateurs :",
        listeError
      );

      return reponseJson(
        request,
        {
          error:
            "Impossible de vérifier les comptes existants.",
        },
        500
      );
    }

    const emailDejaUtilise =
      listeUtilisateurs
        .users
        .find(
          (
            utilisateur
          ) =>
            utilisateur.email
              ?.toLowerCase() ===
            email
        );

    const profilDejaDansEntreprise =
      emailDejaUtilise
        ? await supabaseAdmin
            .from(
              "profils_utilisateurs"
            )
            .select(
              "id, email, role, entreprise_id, statut"
            )
            .eq(
              "id",
              emailDejaUtilise.id
            )
            .maybeSingle()
        : {
            data:
              null,

            error:
              null,
          };

    if (
      profilDejaDansEntreprise
        .error
    ) {
      console.error(
        "Erreur vérification profil salarié existant :",
        profilDejaDansEntreprise.error
      );

      return reponseJson(
        request,
        {
          error:
            "Impossible de vérifier le profil existant.",
        },
        500
      );
    }

    if (
      profilDejaDansEntreprise
        .data &&
      profilDejaDansEntreprise
        .data
        .entreprise_id !==
        profilChef.entreprise_id
    ) {
      return reponseJson(
        request,
        {
          error:
            "Cet email est déjà utilisé par une autre entreprise.",
        },
        400
      );
    }

    if (
      profilDejaDansEntreprise
        .data
        ?.role ===
      "chef"
    ) {
      return reponseJson(
        request,
        {
          error:
            "Cet email correspond déjà à un compte chef.",
        },
        400
      );
    }

    const utilisateurDejaCompte =
      Boolean(
        emailDejaUtilise
      );

    if (
      !utilisateurDejaCompte &&
      (
        nombreUtilisateurs ||
        0
      ) >=
        limiteUtilisateurs
    ) {
      return reponseJson(
        request,
        {
          error:
            `Limite atteinte pour le plan ${plan}. Le plan autorise ${limiteUtilisateurs} utilisateur${
              limiteUtilisateurs >
              1
                ? "s"
                : ""
            } actif${
              limiteUtilisateurs >
              1
                ? "s"
                : ""
            }.`,
        },
        403
      );
    }

    /*
     * IMPORTANT MOBILE :
     *
     * On n'utilise PAS l'Origin de la requête
     * pour le lien d'invitation.
     *
     * Sur Android l'origine peut être :
     *
     * capacitor://localhost
     *
     * Le salarié doit ouvrir son invitation
     * sur le vrai site Arboboard afin de définir
     * son mot de passe.
     */
    const redirectTo =
      `${urlSiteWeb()}/auth/set-password`;

    let userSalarieId =
      "";

    if (
      emailDejaUtilise
    ) {
      userSalarieId =
        emailDejaUtilise.id;
    } else {
      const {
        data:
          invitation,
        error:
          erreurInvitation,
      } =
        await supabaseAdmin
          .auth
          .admin
          .inviteUserByEmail(
            email,
            {
              redirectTo,

              data: {
                nom,

                prenom,

                telephone,

                role:
                  "salarie",

                entreprise_id:
                  profilChef.entreprise_id,
              },
            }
          );

      if (
        erreurInvitation ||
        !invitation.user
      ) {
        console.error(
          "Erreur invitation salarié :",
          erreurInvitation
        );

        return reponseJson(
          request,
          {
            error:
              "Impossible d’envoyer l’invitation.",
          },
          400
        );
      }

      userSalarieId =
        invitation.user.id;
    }

    const {
      error:
        erreurProfilSalarie,
    } =
      await supabaseAdmin
        .from(
          "profils_utilisateurs"
        )
        .upsert(
          {
            id:
              userSalarieId,

            email,

            role:
              "salarie",

            nom:
              nom ||
              null,

            prenom:
              prenom ||
              null,

            statut:
              "actif",

            entreprise_id:
              profilChef.entreprise_id,

            telephone_mfa:
              telephone,
          },
          {
            onConflict:
              "id",
          }
        );

    if (
      erreurProfilSalarie
    ) {
      console.error(
        "Erreur création ou mise à jour du profil salarié :",
        erreurProfilSalarie
      );

      return reponseJson(
        request,
        {
          error:
            "Le profil salarié n’a pas pu être créé.",
        },
        500
      );
    }

    let salarieId =
      body.salarieId ||
      "";

    if (
      !salarieId
    ) {
      const {
        data:
          salarieExistant,
        error:
          erreurRechercheSalarie,
      } =
        await supabaseAdmin
          .from(
            "salaries"
          )
          .select(
            "id"
          )
          .eq(
            "entreprise_id",
            profilChef.entreprise_id
          )
          .ilike(
            "email",
            email
          )
          .limit(
            1
          )
          .maybeSingle();

      if (
        erreurRechercheSalarie
      ) {
        console.error(
          "Erreur recherche fiche salarié :",
          erreurRechercheSalarie
        );
      }

      salarieId =
        salarieExistant
          ?.id ||
        "";
    }

    if (
      salarieId
    ) {
      const {
        error:
          erreurMiseAJourSalarie,
      } =
        await supabaseAdmin
          .from(
            "salaries"
          )
          .update({
            email,

            nom:
              nom ||
              null,

            prenom:
              prenom ||
              null,

            telephone,

            user_id:
              userSalarieId,

            profil_id:
              userSalarieId,

            statut:
              "Actif",

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            salarieId
          )
          .eq(
            "entreprise_id",
            profilChef.entreprise_id
          );

      if (
        erreurMiseAJourSalarie
      ) {
        console.error(
          "Erreur liaison fiche salarié et compte utilisateur :",
          erreurMiseAJourSalarie
        );

        return reponseJson(
          request,
          {
            error:
              "Le compte a été créé, mais la fiche salarié n’a pas pu être liée.",
          },
          500
        );
      }
    }

    return reponseJson(
      request,
      {
        success:
          true,

        message:
          utilisateurDejaCompte
            ? "Profil salarié rattaché à l’entreprise."
            : "Invitation envoyée au salarié.",

        userId:
          userSalarieId,

        salarieId:
          salarieId ||
          null,

        plan,

        limiteUtilisateurs,

        nombreUtilisateursAvantCreation:
          nombreUtilisateurs ||
          0,
      },
      200
    );
  } catch (
    error
  ) {
    console.error(
      "Erreur création du compte salarié :",
      error
    );

    return reponseJson(
      request,
      {
        error:
          "Une erreur est survenue pendant la création du compte salarié.",
      },
      500
    );
  }
}