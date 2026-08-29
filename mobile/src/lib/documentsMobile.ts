import {
  supabase,
} from "./supabase";

export type TypeDocumentMobile =
  | "devis"
  | "facture"
  | "avoir";

export type ResultatPdfMobile = {
  blob: Blob;
  filename: string;
  url: string;
};

export type EnvoyerDocumentEmailMobileParams = {
  typeDocument:
    TypeDocumentMobile;

  documentId:
    string;

  email:
    string;

  sujet?:
    string;

  message?:
    string;
};

export type ReponseEnvoiDocument = {
  success:
    boolean;

  typeDocument?:
    TypeDocumentMobile;

  resendId?:
    string | null;

  pieceJointe?:
    string | null;

  message?:
    string;

  error?:
    string;
};

const API_BASE_URL =
  String(
    import.meta.env
      .VITE_API_URL ||
      "https://arboboard.fr"
  ).replace(
    /\/+$/,
    ""
  );

/*
 * =========================================================
 * SESSION SUPABASE
 * =========================================================
 */

async function obtenirAccessToken() {
  const {
    data: {
      session,
    },
    error,
  } =
    await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (
    session?.access_token
  ) {
    return session.access_token;
  }

  /*
   * Tentative de renouvellement
   * avant de demander une nouvelle connexion.
   */

  const {
    data:
      refreshData,
    error:
      refreshError,
  } =
    await supabase.auth.refreshSession();

  if (
    refreshError
  ) {
    throw refreshError;
  }

  if (
    !refreshData.session
      ?.access_token
  ) {
    throw new Error(
      "Votre session a expiré. Veuillez vous reconnecter."
    );
  }

  return refreshData
    .session
    .access_token;
}

/*
 * =========================================================
 * ERREURS API
 * =========================================================
 */

async function lireErreurApi(
  response: Response,
  messageDefaut: string
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    const data =
      await response
        .json()
        .catch(
          () => null
        );

    const message =
      data?.error ||
      data?.message;

    if (
      typeof message ===
        "string" &&
      message.trim()
    ) {
      return message.trim();
    }
  }

  const texte =
    await response
      .text()
      .catch(
        () => ""
      );

  if (
    texte.trim() &&
    texte.length <
      500
  ) {
    return texte.trim();
  }

  return messageDefaut;
}

/*
 * =========================================================
 * NOM DU PDF
 * =========================================================
 */

function decoderNomFichier(
  valeur: string
) {
  try {
    return decodeURIComponent(
      valeur
    );
  } catch {
    return valeur;
  }
}

function extraireNomFichier(
  response: Response,
  typeDocument:
    TypeDocumentMobile
) {
  const disposition =
    response.headers.get(
      "content-disposition"
    ) || "";

  /*
   * filename*=UTF-8''...
   */

  const utf8 =
    disposition.match(
      /filename\*=UTF-8''([^;]+)/i
    );

  if (
    utf8?.[1]
  ) {
    return decoderNomFichier(
      utf8[1]
        .replace(
          /^["']|["']$/g,
          ""
        )
        .trim()
    );
  }

  /*
   * filename="..."
   */

  const simple =
    disposition.match(
      /filename="?([^";]+)"?/i
    );

  if (
    simple?.[1]
  ) {
    return simple[1]
      .trim();
  }

  if (
    typeDocument ===
    "devis"
  ) {
    return "devis.pdf";
  }

  if (
    typeDocument ===
    "avoir"
  ) {
    return "avoir.pdf";
  }

  return "facture.pdf";
}

/*
 * =========================================================
 * GENERATION PDF
 * =========================================================
 */

export async function genererPdfDocumentMobile(
  typeDocument:
    TypeDocumentMobile,
  documentId: string
): Promise<ResultatPdfMobile> {
  const id =
    String(
      documentId || ""
    ).trim();

  if (!id) {
    throw new Error(
      "Identifiant du document manquant."
    );
  }

  const token =
    await obtenirAccessToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/documents/pdf`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body:
          JSON.stringify({
            typeDocument,
            documentId:
              id,

            mode:
              "inline",
          }),
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      await lireErreurApi(
        response,
        "Impossible de générer le PDF."
      )
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    !contentType.includes(
      "application/pdf"
    )
  ) {
    throw new Error(
      "Le serveur n’a pas retourné un fichier PDF valide."
    );
  }

  const blob =
    await response.blob();

  if (
    blob.size ===
    0
  ) {
    throw new Error(
      "Le fichier PDF généré est vide."
    );
  }

  const filename =
    extraireNomFichier(
      response,
      typeDocument
    );

  const url =
    URL.createObjectURL(
      blob
    );

  return {
    blob,
    filename,
    url,
  };
}

/*
 * =========================================================
 * OUVRIR LE PDF
 * =========================================================
 */

export async function ouvrirPdfDocumentMobile(
  typeDocument:
    TypeDocumentMobile,
  documentId: string
) {
  const resultat =
    await genererPdfDocumentMobile(
      typeDocument,
      documentId
    );

  /*
   * Navigateur Vite / WebView Capacitor.
   *
   * L'URL Blob n'expose aucune clé ou donnée serveur.
   */

  const nouvelleFenetre =
    window.open(
      resultat.url,
      "_blank",
      "noopener,noreferrer"
    );

  /*
   * Certains navigateurs bloquent window.open()
   * lorsqu'il intervient après un await.
   *
   * On utilise alors un lien temporaire.
   */

  if (
    !nouvelleFenetre
  ) {
    const lien =
      document.createElement(
        "a"
      );

    lien.href =
      resultat.url;

    lien.target =
      "_blank";

    lien.rel =
      "noopener noreferrer";

    document.body.appendChild(
      lien
    );

    lien.click();

    lien.remove();
  }

  /*
   * Le Blob reste disponible suffisamment
   * longtemps pour que le lecteur PDF l'ouvre.
   */

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        resultat.url
      );
    },
    60_000
  );

  return {
    filename:
      resultat.filename,
  };
}

/*
 * =========================================================
 * TELECHARGER LE PDF
 * =========================================================
 */

export async function telechargerPdfDocumentMobile(
  typeDocument:
    TypeDocumentMobile,
  documentId: string
) {
  const resultat =
    await genererPdfDocumentMobile(
      typeDocument,
      documentId
    );

  const lien =
    document.createElement(
      "a"
    );

  lien.href =
    resultat.url;

  lien.download =
    resultat.filename;

  lien.rel =
    "noopener";

  document.body.appendChild(
    lien
  );

  lien.click();

  lien.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        resultat.url
      );
    },
    10_000
  );

  return {
    filename:
      resultat.filename,
  };
}

/*
 * =========================================================
 * ENVOI EMAIL
 * =========================================================
 */

export async function envoyerDocumentEmailMobile(
  params:
    EnvoyerDocumentEmailMobileParams
): Promise<ReponseEnvoiDocument> {
  const documentId =
    String(
      params.documentId ||
        ""
    ).trim();

  const email =
    String(
      params.email ||
        ""
    )
      .trim()
      .toLowerCase();

  if (
    !documentId
  ) {
    throw new Error(
      "Identifiant du document manquant."
    );
  }

  if (
    !email
  ) {
    throw new Error(
      "Adresse e-mail du destinataire manquante."
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw new Error(
      "L’adresse e-mail du destinataire n’est pas valide."
    );
  }

  const token =
    await obtenirAccessToken();

  const payload: {
    typeDocument:
      TypeDocumentMobile;

    documentId:
      string;

    email:
      string;

    sujet?:
      string;

    message?:
      string;
  } = {
    typeDocument:
      params.typeDocument,

    documentId,

    email,
  };

  const sujet =
    String(
      params.sujet ||
        ""
    ).trim();

  const message =
    String(
      params.message ||
        ""
    ).trim();

  /*
   * Si sujet/message restent vides,
   * le serveur Arboboard utilise
   * les modèles configurés dans
   * entreprise_parametres.
   */

  if (
    sujet
  ) {
    payload.sujet =
      sujet;
  }

  if (
    message
  ) {
    payload.message =
      message;
  }

  const response =
    await fetch(
      `${API_BASE_URL}/api/documents/envoyer-email`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );

  const resultat =
    (
      await response
        .json()
        .catch(
          () => null
        )
    ) as
      | ReponseEnvoiDocument
      | null;

  if (
    !response.ok ||
    !resultat?.success
  ) {
    throw new Error(
      resultat?.error ||
        resultat?.message ||
        "Impossible d’envoyer le document par e-mail."
    );
  }

  return {
    success:
      true,

    typeDocument:
      resultat.typeDocument,

    resendId:
      resultat.resendId ||
      null,

    pieceJointe:
      resultat.pieceJointe ||
      null,

    message:
      resultat.message ||
      "Document envoyé avec succès.",
  };
}

/*
 * =========================================================
 * UTILITAIRES
 * =========================================================
 */

export function obtenirApiBaseUrlMobile() {
  return API_BASE_URL;
}