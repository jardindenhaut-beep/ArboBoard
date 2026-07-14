import "server-only";

const URL_TOKEN =
  "https://api.urssaf.fr/api/oauth/v1/token";

const URL_BASE =
  "https://api.urssaf.fr/atp/v1/tiersPrestations";

const SCOPE =
  "homeplus.tiersprestations";

export type IdentifiantsUrssaf = {
  clientId: string;
  clientSecret: string;
};

export type AdressePostaleUrssaf = {
  numeroVoie?: string;
  lettreVoie?: string;
  codeTypeVoie?: string;
  libelleVoie?: string;
  complement?: string;
  lieuDit?: string;
  libelleCommune: string;
  codeCommune: string;
  codePostal: string;
  codePays: string;
};

export type LieuNaissanceUrssaf = {
  codePaysNaissance: string;
  departementNaissance?: string;
  communeNaissance?: {
    codeCommune: string;
    libelleCommune: string;
  };
};

export type ParticulierUrssafPayload = {
  civilite: "1" | "2";
  nomNaissance: string;
  nomUsage?: string;
  prenoms: string;
  dateNaissance: string;
  lieuNaissance: LieuNaissanceUrssaf;
  numeroTelephonePortable: string;
  adresseMail: string;
  adressePostale: AdressePostaleUrssaf;
  coordonneeBancaire: {
    bic: string;
    iban: string;
    titulaire: string;
  };
};

export type StatutTransmissionUrssaf = {
  code?: string | null;
  description?: string | null;
  etat?: string | null;
};

export type ReponseStatutParticulierUrssaf = {
  idClient?: string | null;
  nomNaissance?: string | null;
  nomUsage?: string | null;
  prenoms?: string | null;
  statut?: StatutTransmissionUrssaf | null;
};

export class ErreurApiUrssaf extends Error {
  codeHttp: number;
  codeMetier: string | null;
  description: string | null;

  constructor({
    message,
    codeHttp,
    codeMetier = null,
    description = null,
  }: {
    message: string;
    codeHttp: number;
    codeMetier?: string | null;
    description?: string | null;
  }) {
    super(message);
    this.name = "ErreurApiUrssaf";
    this.codeHttp = codeHttp;
    this.codeMetier = codeMetier;
    this.description = description;
  }
}

function nettoyerMessage(valeur: unknown) {
  return typeof valeur === "string"
    ? valeur.replace(/\s+/g, " ").trim().slice(0, 1000)
    : "";
}

function extraireErreur(
  valeur: unknown,
  codeHttp: number
) {
  const premier =
    Array.isArray(valeur) && valeur.length > 0
      ? valeur[0]
      : valeur;

  if (
    premier &&
    typeof premier === "object"
  ) {
    const objet = premier as Record<string, unknown>;

    const code =
      nettoyerMessage(objet.code) || null;

    const message =
      nettoyerMessage(objet.message);

    const description =
      nettoyerMessage(objet.description) || null;

    return new ErreurApiUrssaf({
      codeHttp,
      codeMetier: code,
      description,
      message:
        [code, message, description]
          .filter(Boolean)
          .join(" — ") ||
        `L’Urssaf a refusé la requête avec le code HTTP ${codeHttp}.`,
    });
  }

  return new ErreurApiUrssaf({
    codeHttp,
    message:
      nettoyerMessage(valeur) ||
      `L’Urssaf a refusé la requête avec le code HTTP ${codeHttp}.`,
  });
}

async function lireJson(
  reponse: Response
): Promise<unknown> {
  const texte = await reponse.text();

  if (!texte) return null;

  try {
    return JSON.parse(texte) as unknown;
  } catch {
    return texte;
  }
}

async function fetchAvecDelai(
  url: string,
  init: RequestInit,
  delaiMs = 20_000
) {
  const controleur = new AbortController();
  const temporisation = setTimeout(
    () => controleur.abort(),
    delaiMs
  );

  try {
    return await fetch(url, {
      ...init,
      signal: controleur.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new ErreurApiUrssaf({
        codeHttp: 504,
        message:
          "Le service Urssaf n’a pas répondu dans le délai prévu.",
      });
    }

    throw new ErreurApiUrssaf({
      codeHttp: 503,
      message:
        error instanceof Error
          ? nettoyerMessage(error.message)
          : "Impossible de joindre le service Urssaf.",
    });
  } finally {
    clearTimeout(temporisation);
  }
}

export async function obtenirJetonUrssaf(
  identifiants: IdentifiantsUrssaf
) {
  const corps = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: identifiants.clientId,
    client_secret: identifiants.clientSecret,
    scope: SCOPE,
  });

  const reponse = await fetchAvecDelai(
    URL_TOKEN,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: corps.toString(),
    },
    15_000
  );

  const donnees = await lireJson(reponse);

  if (!reponse.ok) {
    throw extraireErreur(
      donnees,
      reponse.status
    );
  }

  if (
    !donnees ||
    typeof donnees !== "object" ||
    !("access_token" in donnees) ||
    typeof donnees.access_token !== "string"
  ) {
    throw new ErreurApiUrssaf({
      codeHttp: 502,
      message:
        "La réponse OAuth2 de l’Urssaf ne contient aucun jeton d’accès.",
    });
  }

  return donnees.access_token;
}

export async function inscrireParticulierUrssaf({
  jeton,
  particulier,
}: {
  jeton: string;
  particulier: ParticulierUrssafPayload;
}) {
  const reponse = await fetchAvecDelai(
    `${URL_BASE}/particulier`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${jeton}`,
      },
      body: JSON.stringify(particulier),
    }
  );

  const donnees = await lireJson(reponse);

  if (!reponse.ok) {
    throw extraireErreur(
      donnees,
      reponse.status
    );
  }

  if (
    !donnees ||
    typeof donnees !== "object" ||
    !("idClient" in donnees) ||
    typeof donnees.idClient !== "string" ||
    !donnees.idClient.trim()
  ) {
    throw new ErreurApiUrssaf({
      codeHttp: 502,
      message:
        "L’Urssaf a accepté la requête mais n’a retourné aucun identifiant client.",
    });
  }

  return {
    idClient: donnees.idClient.trim(),
    codeHttp: reponse.status,
  };
}

export async function obtenirStatutParticulierUrssaf({
  jeton,
  idClient,
  adresseMail,
}: {
  jeton: string;
  idClient: string;
  adresseMail: string;
}) {
  const parametres = new URLSearchParams({
    adresseMail,
    idClient,
  });

  const reponse = await fetchAvecDelai(
    `${URL_BASE}/particulier?${parametres.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jeton}`,
      },
    }
  );

  const donnees = await lireJson(reponse);

  if (!reponse.ok) {
    throw extraireErreur(
      donnees,
      reponse.status
    );
  }

  const resultat =
    Array.isArray(donnees)
      ? donnees[0]
      : donnees;

  if (
    !resultat ||
    typeof resultat !== "object"
  ) {
    throw new ErreurApiUrssaf({
      codeHttp: 502,
      message:
        "La réponse de statut retournée par l’Urssaf est vide.",
    });
  }

  return {
    donnees:
      resultat as ReponseStatutParticulierUrssaf,
    codeHttp: reponse.status,
  };
}