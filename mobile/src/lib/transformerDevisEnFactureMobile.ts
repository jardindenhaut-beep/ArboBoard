import {
  supabase,
} from "./supabase";

const API_ARBOBOARD =
  String(
    import.meta.env
      .VITE_ARBOBOARD_API_URL ||
      "https://arboboard.fr"
  )
    .trim()
    .replace(
      /\/+$/,
      ""
    );

type ReponseTransformation = {
  success?: boolean;

  factureId?: string;

  numero?: string;

  message?: string;

  error?: string;

  erreur?: string;
};

export type FactureDepuisDevisMobile = {
  factureId: string;

  numero: string;

  message: string;
};

function messageErreur(
  valeur: unknown,
  fallback: string
) {
  if (
    valeur &&
    typeof valeur === "object"
  ) {
    const objet =
      valeur as {
        error?: unknown;
        erreur?: unknown;
        message?: unknown;
      };

    if (
      typeof objet.error ===
      "string" &&
      objet.error.trim()
    ) {
      return objet.error;
    }

    if (
      typeof objet.erreur ===
      "string" &&
      objet.erreur.trim()
    ) {
      return objet.erreur;
    }

    if (
      typeof objet.message ===
      "string" &&
      objet.message.trim()
    ) {
      return objet.message;
    }
  }

  if (
    valeur instanceof Error &&
    valeur.message
  ) {
    return valeur.message;
  }

  return fallback;
}

export async function transformerDevisEnFactureMobile(
  devisId: string
): Promise<FactureDepuisDevisMobile> {
  const id =
    devisId.trim();

  if (
    !id
  ) {
    throw new Error(
      "Identifiant du devis manquant."
    );
  }

  const {
    data: {
      session,
    },
    error:
      sessionError,
  } =
    await supabase.auth.getSession();

  if (
    sessionError
  ) {
    throw sessionError;
  }

  const accessToken =
    session?.access_token ||
    null;

  if (
    !accessToken
  ) {
    throw new Error(
      "Session Arboboard expirée. Reconnectez-vous."
    );
  }

  try {
    const response =
      await fetch(
        `${API_ARBOBOARD}/api/devis/transformer-en-facture`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",

            "X-Arboboard-Client":
              "mobile",
          },

          cache:
            "no-store",

          body:
            JSON.stringify({
              devisId:
                id,
            }),
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
        | ReponseTransformation
        | null;

    if (
      !response.ok ||
      donnees?.success !==
        true
    ) {
      throw new Error(
        messageErreur(
          donnees,
          "Impossible de transformer le devis en facture."
        )
      );
    }

    const factureId =
      String(
        donnees.factureId ||
          ""
      ).trim();

    const numero =
      String(
        donnees.numero ||
          ""
      ).trim();

    if (
      !factureId
    ) {
      throw new Error(
        "La facture a été créée sans identifiant."
      );
    }

    if (
      !numero
    ) {
      throw new Error(
        "La facture a été créée sans numéro."
      );
    }

    return {
      factureId,

      numero,

      message:
        String(
          donnees.message ||
            `Facture ${numero} créée avec succès.`
        ),
    };
  } catch (
    error
  ) {
    throw new Error(
      messageErreur(
        error,
        "Impossible de transformer le devis en facture."
      )
    );
  }
}