import "server-only";

import {
  ErreurApiUrssaf,
} from "@/lib/server/urssafTp";

const URL_BASE =
  "https://api.urssaf.fr/atp/v1/tiersPrestations";

export type PrestationDemandePaiementUrssaf = {
  codeActivite?: string;
  codeNature: string;
  quantite: number;
  unite: "HEURE" | "FORFAIT";
  mntUnitaireTTC: number;
  mntPrestationTTC: number;
  mntPrestationHT: number;
  mntPrestationTVA: number;
  dateDebutEmploi: string;
  dateFinEmploi: string;
  complement1?: string;
  complement2: string;
};

export type DemandePaiementUrssafPayload = {
  idTiersFacturation: string;
  idClient: string;
  dateNaissanceClient: string;
  numFactureTiers: string;
  dateFacture: string;
  dateDebutEmploi: string;
  dateFinEmploi: string;
  mntAcompte?: number;
  dateVersementAcompte?: string;
  mntFactureTTC: number;
  mntFactureHT: number;
  inputPrestations:
    PrestationDemandePaiementUrssaf[];
};

export type ErreurRetourUrssaf = {
  code?: string | null;
  message?: string | null;
  description?: string | null;
};

export type RetourTransmissionDemandePaiement = {
  idClient?: string | null;
  idDemandePaiement?: string | null;
  numFactureTiers?: string | null;
  statut?: string | null;
  errors?: ErreurRetourUrssaf[];
};

export type RechercheDemandePaiementUrssaf = {
  idDemandePaiement?: string | null;
  demandePaiement?: Record<string, unknown> | null;
  statut?: {
    code?: string | null;
    libelle?: string | null;
  } | null;
  infoRejet?: {
    code?: string | null;
    commentaire?: string | null;
  } | null;
  infoVirement?: {
    mntVirement?: number | null;
    dateVirement?: string | null;
  } | null;
};

function nettoyerMessage(
  valeur: unknown,
  longueur = 1000
) {
  return typeof valeur === "string"
    ? valeur
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, longueur)
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
    const objet =
      premier as Record<string, unknown>;

    const code =
      nettoyerMessage(objet.code, 100) || null;
    const message =
      nettoyerMessage(objet.message);
    const description =
      nettoyerMessage(objet.description) ||
      null;

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

function trouverObjetDemande(
  valeur: unknown
): RechercheDemandePaiementUrssaf | null {
  if (Array.isArray(valeur)) {
    for (const element of valeur) {
      const resultat =
        trouverObjetDemande(element);

      if (resultat) return resultat;
    }

    return null;
  }

  if (
    !valeur ||
    typeof valeur !== "object"
  ) {
    return null;
  }

  const objet =
    valeur as Record<string, unknown>;

  if (
    "idDemandePaiement" in objet &&
    (
      "demandePaiement" in objet ||
      "statut" in objet ||
      "infoRejet" in objet ||
      "infoVirement" in objet
    )
  ) {
    return objet as
      RechercheDemandePaiementUrssaf;
  }

  for (const enfant of Object.values(objet)) {
    const resultat =
      trouverObjetDemande(enfant);

    if (resultat) return resultat;
  }

  return null;
}

export async function transmettreDemandePaiementUrssaf({
  jeton,
  demande,
}: {
  jeton: string;
  demande: DemandePaiementUrssafPayload;
}) {
  const reponse = await fetchAvecDelai(
    `${URL_BASE}/demandePaiement`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${jeton}`,
      },
      body: JSON.stringify([demande]),
    }
  );

  const donnees = await lireJson(reponse);

  if (!reponse.ok) {
    throw extraireErreur(
      donnees,
      reponse.status
    );
  }

  const premier =
    Array.isArray(donnees)
      ? donnees[0]
      : donnees;

  if (
    !premier ||
    typeof premier !== "object"
  ) {
    throw new ErreurApiUrssaf({
      codeHttp: 502,
      message:
        "La réponse de transmission retournée par l’Urssaf est vide.",
    });
  }

  const retour =
    premier as RetourTransmissionDemandePaiement;

  return {
    retour,
    codeHttp: reponse.status,
  };
}

export async function rechercherDemandePaiementUrssaf({
  jeton,
  idDemandePaiement,
  numeroFacture,
}: {
  jeton: string;
  idDemandePaiement?: string | null;
  numeroFacture?: string | null;
}) {
  const corps: {
    idDemandePaiements?: string[];
    numFactureTiers?: string[];
  } = {};

  if (idDemandePaiement) {
    corps.idDemandePaiements = [
      idDemandePaiement,
    ];
  } else if (numeroFacture) {
    corps.numFactureTiers = [
      numeroFacture,
    ];
  } else {
    throw new Error(
      "Aucun critère de recherche Urssaf n’est disponible."
    );
  }

  const reponse = await fetchAvecDelai(
    `${URL_BASE}/demandePaiement/rechercher`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${jeton}`,
      },
      body: JSON.stringify(corps),
    }
  );

  const donnees = await lireJson(reponse);

  if (!reponse.ok) {
    throw extraireErreur(
      donnees,
      reponse.status
    );
  }

  const demande =
    trouverObjetDemande(donnees);

  if (!demande) {
    throw new ErreurApiUrssaf({
      codeHttp: 404,
      message:
        "Aucune demande de paiement correspondant à la facture n’a été trouvée.",
    });
  }

  return {
    demande,
    codeHttp: reponse.status,
  };
}