import {
  supabase,
} from "./supabase";

type TypeDocument =
  | "devis"
  | "facture"
  | "avoir";

type ReponseNumero = {
  success?: boolean;

  typeDocument?: string;

  numero?: string;

  error?: string;
};

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

function messageErreur(
  valeur:
    unknown,
  fallback:
    string
) {
  if (
    valeur &&
    typeof valeur ===
      "object" &&
    "error" in valeur &&
    typeof (
      valeur as {
        error?: unknown;
      }
    ).error ===
      "string"
  ) {
    return (
      valeur as {
        error: string;
      }
    ).error;
  }

  if (
    valeur instanceof
      Error &&
    valeur.message
  ) {
    return valeur.message;
  }

  return fallback;
}

export async function genererNumeroDocumentMobile(
  typeDocument:
    TypeDocument
) {
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
      "Session Arboboard introuvable."
    );
  }

  try {
    const response =
      await fetch(
        `${API_ARBOBOARD}/api/documents/generer-numero`,
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
              typeDocument,
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
        | ReponseNumero
        | null;

    if (
      !response.ok ||
      !donnees?.success
    ) {
      throw new Error(
        messageErreur(
          donnees,
          "Impossible de générer le numéro du document."
        )
      );
    }

    const numero =
      String(
        donnees.numero ||
          ""
      ).trim();

    if (
      !numero
    ) {
      throw new Error(
        "Le serveur n’a retourné aucun numéro."
      );
    }

    return numero;
  } catch (
    error
  ) {
    throw new Error(
      messageErreur(
        error,
        "Impossible de générer le numéro du document."
      )
    );
  }
}