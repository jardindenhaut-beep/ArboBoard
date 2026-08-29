import {
  Capacitor,
} from "@capacitor/core";

import {
  SecureStorage,
} from "@aparajita/capacitor-secure-storage";

import {
  supabase,
} from "./supabase";

const CLE_JETON_APPAREIL =
  "arboboard_appareil_confiance_mobile";

const API_ARBOBOARD =
  String(
    import.meta.env.VITE_ARBOBOARD_API_URL ||
      "https://arboboard.fr"
  )
    .trim()
    .replace(
      /\/+$/,
      ""
    );

type ReponseVerification = {
  confiance?: boolean;
  raison?: string;
  appareilId?: string;
  nomAppareil?: string;
  navigateur?: string | null;
  systeme?: string | null;
  expireAt?: string;
  client?: string;
  erreur?: string;
};

type ReponseEnregistrement = {
  success?: boolean;

  jeton_appareil?: string;

  expire_at?: string;

  duree_jours?: number;

  appareil?: {
    id?: string;

    nom_appareil?: string;

    navigateur?: string | null;

    systeme?: string | null;

    created_at?: string;

    derniere_utilisation_at?: string;

    expire_at?: string;

    appareil_actuel?: boolean;
  };

  erreur?: string;
};

export type AppareilConfianceMobileEnregistre = {
  appareilId: string | null;

  nomAppareil: string | null;

  expireAt: string | null;

  dureeJours: number;
};

function messageErreur(
  valeur: unknown,
  fallback: string
) {
  if (
    valeur &&
    typeof valeur === "object" &&
    "erreur" in valeur &&
    typeof (
      valeur as {
        erreur?: unknown;
      }
    ).erreur === "string"
  ) {
    return (
      valeur as {
        erreur: string;
      }
    ).erreur;
  }

  if (
    valeur instanceof Error &&
    valeur.message
  ) {
    return valeur.message;
  }

  return fallback;
}

export function estApplicationNative() {
  return Capacitor.isNativePlatform();
}

async function obtenirJetonSession(
  jetonFourni?: string | null
) {
  if (
    jetonFourni
  ) {
    return jetonFourni;
  }

  const {
    data: {
      session,
    },
    error,
  } =
    await supabase.auth.getSession();

  if (
    error
  ) {
    throw error;
  }

  return (
    session?.access_token ||
    null
  );
}

export async function lireJetonAppareilConfianceMobile() {
  /*
   * IMPORTANT :
   *
   * Sur navigateur, le plugin de stockage
   * sécurisé utilise un fallback Web.
   *
   * Arboboard refuse volontairement de
   * stocker le jeton 90 jours dans ce mode.
   *
   * Le jeton n'est donc disponible que
   * dans la vraie application Capacitor.
   */
  if (
    !estApplicationNative()
  ) {
    return null;
  }

  try {
    const valeur =
      await SecureStorage.getItem(
        CLE_JETON_APPAREIL
      );

    if (
      !valeur
    ) {
      return null;
    }

    const jeton =
      String(
        valeur
      ).trim();

    if (
      jeton.length < 20
    ) {
      await supprimerJetonAppareilConfianceMobile();

      return null;
    }

    return jeton;
  } catch (
    error
  ) {
    console.warn(
      "Lecture jeton appareil sécurisé :",
      error
    );

    return null;
  }
}

export async function enregistrerJetonAppareilConfianceMobile(
  jeton: string
) {
  if (
    !estApplicationNative()
  ) {
    throw new Error(
      "Le stockage sécurisé des appareils de confiance est disponible uniquement dans l’application Android ou iOS."
    );
  }

  const valeur =
    jeton.trim();

  if (
    valeur.length < 20
  ) {
    throw new Error(
      "Le jeton d’appareil reçu est invalide."
    );
  }

  await SecureStorage.setItem(
    CLE_JETON_APPAREIL,
    valeur
  );
}

export async function supprimerJetonAppareilConfianceMobile() {
  if (
    !estApplicationNative()
  ) {
    return;
  }

  try {
    await SecureStorage.removeItem(
      CLE_JETON_APPAREIL
    );
  } catch (
    error
  ) {
    console.warn(
      "Suppression jeton appareil sécurisé :",
      error
    );
  }
}

function raisonJetonDefinitivementInvalide(
  raison: string | undefined
) {
  return [
    "appareil_inconnu",
    "appareil_revoque",
    "appareil_expire",
  ].includes(
    String(
      raison || ""
    )
  );
}

export async function verifierAppareilConfianceMobile(
  jetonSession?: string | null
) {
  if (
    !estApplicationNative()
  ) {
    return false;
  }

  const jetonAppareil =
    await lireJetonAppareilConfianceMobile();

  if (
    !jetonAppareil
  ) {
    return false;
  }

  try {
    const accessToken =
      await obtenirJetonSession(
        jetonSession
      );

    if (
      !accessToken
    ) {
      return false;
    }

    const response =
      await fetch(
        `${API_ARBOBOARD}/api/auth/appareils-confiance/verifier`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "X-Arboboard-Client":
              "mobile",

            "X-Arboboard-Device-Token":
              jetonAppareil,
          },

          cache: "no-store",
        }
      );

    const donnees =
      (
        await response
          .json()
          .catch(
            () => null
          )
      ) as
        | ReponseVerification
        | null;

    if (
      !response.ok
    ) {
      return false;
    }

    if (
      donnees?.confiance === true
    ) {
      return true;
    }

    if (
      raisonJetonDefinitivementInvalide(
        donnees?.raison
      )
    ) {
      await supprimerJetonAppareilConfianceMobile();
    }

    return false;
  } catch (
    error
  ) {
    console.warn(
      "Vérification appareil de confiance mobile :",
      error
    );

    /*
     * Une panne réseau ne doit jamais
     * supprimer un jeton encore valide.
     */
    return false;
  }
}

export async function enregistrerAppareilConfianceMobile(
  jetonSession?: string | null
): Promise<AppareilConfianceMobileEnregistre> {
  if (
    !estApplicationNative()
  ) {
    throw new Error(
      "L’appareil de confiance ne peut être enregistré que depuis l’application Android ou iOS."
    );
  }

  const accessToken =
    await obtenirJetonSession(
      jetonSession
    );

  if (
    !accessToken
  ) {
    throw new Error(
      "Session Arboboard introuvable."
    );
  }

  const ancienJeton =
    await lireJetonAppareilConfianceMobile();

  const headers:
    Record<string, string> = {
      Authorization:
        `Bearer ${accessToken}`,

      "Content-Type":
        "application/json",

      "X-Arboboard-Client":
        "mobile",
    };

  if (
    ancienJeton
  ) {
    headers[
      "X-Arboboard-Device-Token"
    ] =
      ancienJeton;
  }

  try {
    const response =
      await fetch(
        `${API_ARBOBOARD}/api/auth/appareils-confiance`,
        {
          method: "POST",

          headers,

          cache: "no-store",
        }
      );

    const donnees =
      (
        await response
          .json()
          .catch(
            () => null
          )
      ) as
        | ReponseEnregistrement
        | null;

    if (
      !response.ok
    ) {
      throw new Error(
        messageErreur(
          donnees,
          "Impossible d’enregistrer cet appareil."
        )
      );
    }

    const nouveauJeton =
      String(
        donnees?.jeton_appareil ||
          ""
      ).trim();

    if (
      nouveauJeton.length < 20
    ) {
      throw new Error(
        "Le serveur n’a pas retourné de jeton d’appareil sécurisé."
      );
    }

    await enregistrerJetonAppareilConfianceMobile(
      nouveauJeton
    );

    return {
      appareilId:
        donnees?.appareil?.id ||
        null,

      nomAppareil:
        donnees?.appareil
          ?.nom_appareil ||
        null,

      expireAt:
        donnees?.expire_at ||
        donnees?.appareil
          ?.expire_at ||
        null,

      dureeJours:
        donnees?.duree_jours ||
        90,
    };
  } catch (
    error
  ) {
    throw new Error(
      messageErreur(
        error,
        "Impossible d’enregistrer cet appareil de confiance."
      )
    );
  }
}

export async function revoquerAppareilConfianceMobile(
  appareilId: string
) {
  const id =
    appareilId.trim();

  if (
    !id
  ) {
    throw new Error(
      "Identifiant d’appareil manquant."
    );
  }

  const accessToken =
    await obtenirJetonSession();

  if (
    !accessToken
  ) {
    throw new Error(
      "Session Arboboard introuvable."
    );
  }

  const jetonAppareil =
    await lireJetonAppareilConfianceMobile();

  const headers:
    Record<string, string> = {
      Authorization:
        `Bearer ${accessToken}`,

      "Content-Type":
        "application/json",

      "X-Arboboard-Client":
        "mobile",
    };

  if (
    jetonAppareil
  ) {
    headers[
      "X-Arboboard-Device-Token"
    ] =
      jetonAppareil;
  }

  const response =
    await fetch(
      `${API_ARBOBOARD}/api/auth/appareils-confiance`,
      {
        method: "DELETE",

        headers,

        cache: "no-store",

        body:
          JSON.stringify({
            appareilId:
              id,
          }),
      }
    );

  const donnees =
    await response
      .json()
      .catch(
        () => null
      );

  if (
    !response.ok
  ) {
    throw new Error(
      messageErreur(
        donnees,
        "Impossible de révoquer cet appareil."
      )
    );
  }

  if (
    donnees?.appareil_actuel_revoque ===
    true
  ) {
    await supprimerJetonAppareilConfianceMobile();
  }

  return true;
}