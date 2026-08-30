import {
  ajouterActionHorsLigne,
  lireCache,
  mettreEnCache,
} from "./offline";

export const ACTION_PV_ENREGISTRER =
  "intervention.pv.enregistrer";

export type PayloadPvHorsLigne = {
  localPvId: string;

  entrepriseId: string;
  ficheId: string;

  clientId:
    string | null;

  clientNom:
    string | null;

  clientEmail:
    string | null;

  clientPresent:
    boolean;

  chantierTermine:
    boolean;

  reserves:
    string | null;

  commentaireClient:
    string | null;

  commentaireEntreprise:
    string | null;

  signataireClientNom:
    string | null;

  signatureClient:
    string | null;

  signataireEntrepriseNom:
    string;

  signatureEntreprise:
    string;

  createdAt: string;
  updatedAt: string;
};

const CLE_PREFIXE =
  "salarie:pv";

function identifiantUnique() {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(
      36
    )
    .slice(
      2,
      12
    )}`;
}

function cleCachePv(
  entrepriseId:
    string,
  ficheId:
    string
) {
  return `${CLE_PREFIXE}:${entrepriseId}:${ficheId}`;
}

function texteOuNull(
  valeur:
    string | null | undefined
) {
  const texte =
    String(
      valeur ||
        ""
    ).trim();

  return texte
    ? texte
    : null;
}

function verifierSignature(
  valeur:
    string,
  nom:
    string
) {
  if (
    !valeur.startsWith(
      "data:image/"
    )
  ) {
    throw new Error(
      `${nom} invalide. Effacez-la puis signez de nouveau.`
    );
  }
}

export async function enregistrerPvHorsLigne({
  entrepriseId,
  ficheId,

  clientId = null,
  clientNom = null,
  clientEmail = null,

  clientPresent,
  chantierTermine,

  reserves = null,
  commentaireClient = null,
  commentaireEntreprise = null,

  signataireClientNom = null,
  signatureClient = null,

  signataireEntrepriseNom,
  signatureEntreprise,
}: {
  entrepriseId:
    string;

  ficheId:
    string;

  clientId?:
    string | null;

  clientNom?:
    string | null;

  clientEmail?:
    string | null;

  clientPresent:
    boolean;

  chantierTermine:
    boolean;

  reserves?:
    string | null;

  commentaireClient?:
    string | null;

  commentaireEntreprise?:
    string | null;

  signataireClientNom?:
    string | null;

  signatureClient?:
    string | null;

  signataireEntrepriseNom:
    string;

  signatureEntreprise:
    string;
}) {
  if (
    !entrepriseId ||
    !ficheId
  ) {
    throw new Error(
      "Entreprise ou intervention manquante."
    );
  }

  const nomEntreprise =
    String(
      signataireEntrepriseNom ||
        ""
    ).trim();

  if (
    !nomEntreprise
  ) {
    throw new Error(
      "Renseignez le nom du représentant de l’entreprise."
    );
  }

  if (
    !signatureEntreprise
  ) {
    throw new Error(
      "La signature du représentant de l’entreprise est obligatoire."
    );
  }

  verifierSignature(
    signatureEntreprise,
    "Signature entreprise"
  );

  const nomClient =
    String(
      signataireClientNom ||
        ""
    ).trim();

  if (
    clientPresent &&
    !nomClient
  ) {
    throw new Error(
      "Renseignez le nom du client ou du signataire."
    );
  }

  if (
    clientPresent &&
    !signatureClient
  ) {
    throw new Error(
      "La signature du client est obligatoire lorsqu’il est présent."
    );
  }

  if (
    clientPresent &&
    signatureClient
  ) {
    verifierSignature(
      signatureClient,
      "Signature client"
    );
  }

  const reservesNettoyees =
    texteOuNull(
      reserves
    );

  if (
    !chantierTermine &&
    !reservesNettoyees
  ) {
    throw new Error(
      "Indiquez les réserves ou travaux restant à réaliser."
    );
  }

  const maintenant =
    new Date().toISOString();

  const existant =
    await lireCache<PayloadPvHorsLigne>(
      cleCachePv(
        entrepriseId,
        ficheId
      )
    );

  const payload:
    PayloadPvHorsLigne = {
      localPvId:
        existant?.localPvId ||
        identifiantUnique(),

      entrepriseId,
      ficheId,

      clientId,

      clientNom:
        texteOuNull(
          clientNom
        ),

      clientEmail:
        texteOuNull(
          clientEmail
        )
          ?.toLowerCase() ||
        null,

      clientPresent,

      chantierTermine,

      reserves:
        reservesNettoyees,

      commentaireClient:
        texteOuNull(
          commentaireClient
        ),

      commentaireEntreprise:
        texteOuNull(
          commentaireEntreprise
        ),

      signataireClientNom:
        clientPresent
          ? nomClient ||
            null
          : null,

      signatureClient:
        clientPresent
          ? signatureClient ||
            null
          : null,

      signataireEntrepriseNom:
        nomEntreprise,

      signatureEntreprise,

      createdAt:
        existant?.createdAt ||
        maintenant,

      updatedAt:
        maintenant,
    };

  await mettreEnCache(
    cleCachePv(
      entrepriseId,
      ficheId
    ),
    payload
  );

  await ajouterActionHorsLigne(
    ACTION_PV_ENREGISTRER,
    payload,
    {
      /*
       * Un seul PV en attente par fiche.
       * Si le salarié le corrige hors ligne,
       * la dernière version remplace la
       * précédente au lieu de créer un doublon.
       */
      cleDeduplication:
        `pv:${entrepriseId}:${ficheId}`,
    }
  );

  return payload;
}

export async function lirePvHorsLigne(
  entrepriseId:
    string,
  ficheId:
    string
) {
  return lireCache<PayloadPvHorsLigne>(
    cleCachePv(
      entrepriseId,
      ficheId
    )
  );
}
