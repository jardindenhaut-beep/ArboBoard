import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import "./ClientsMobile.css";

type Props = {
  entrepriseId: string;
  onFermer: () => void;
};

type TypeClient =
  | "particulier"
  | "entreprise"
  | "collectivite";

type StatutClient =
  | "actif"
  | "archive";

type FiltreType =
  | "tous"
  | TypeClient;

type FiltreStatut =
  | "actif"
  | "archive"
  | "tous";

type Client = {
  id: string;

  entreprise_id:
    string;

  type_client:
    string | null;

  nom:
    string | null;

  prenom:
    string | null;

  entreprise:
    string | null;

  email:
    string | null;

  telephone:
    string | null;

  adresse:
    string | null;

  code_postal:
    string | null;

  ville:
    string | null;

  adresse_chantier:
    string | null;

  code_postal_chantier:
    string | null;

  ville_chantier:
    string | null;

  notes:
    string | null;

  notes_chantier:
    string | null;

  statut:
    string | null;

  created_at:
    string | null;

  updated_at:
    string | null;
};

type DevisClient = {
  id: string;

  numero:
    string | null;

  objet:
    string | null;

  statut:
    string | null;

  date_devis:
    string | null;

  total_ttc:
    number | null;
};

type FactureClient = {
  id: string;

  numero:
    string | null;

  objet:
    string | null;

  statut:
    string | null;

  date_facture:
    string | null;

  date_echeance:
    string | null;

  total_ttc:
    number | null;

  montant_paye:
    number | null;

  reste_a_payer:
    number | null;

  est_avoir:
    boolean | null;

  type_facture:
    string | null;
};

type FormulaireClient = {
  type_client:
    TypeClient;

  nom:
    string;

  prenom:
    string;

  entreprise:
    string;

  email:
    string;

  telephone:
    string;

  adresse:
    string;

  code_postal:
    string;

  ville:
    string;

  adresse_chantier:
    string;

  code_postal_chantier:
    string;

  ville_chantier:
    string;

  notes:
    string;

  notes_chantier:
    string;

  statut:
    StatutClient;
};

const FORMULAIRE_VIDE:
  FormulaireClient = {
  type_client:
    "particulier",

  nom:
    "",

  prenom:
    "",

  entreprise:
    "",

  email:
    "",

  telephone:
    "",

  adresse:
    "",

  code_postal:
    "",

  ville:
    "",

  adresse_chantier:
    "",

  code_postal_chantier:
    "",

  ville_chantier:
    "",

  notes:
    "",

  notes_chantier:
    "",

  statut:
    "actif",
};

function nettoyerTexte(
  valeur: string
) {
  const texte =
    valeur.trim();

  return texte ||
    null;
}

function normaliserType(
  valeur:
    | string
    | null
    | undefined
): TypeClient {
  if (
    valeur ===
      "entreprise" ||
    valeur ===
      "collectivite"
  ) {
    return valeur;
  }

  return "particulier";
}

function normaliserStatut(
  valeur:
    | string
    | null
    | undefined
): StatutClient {
  return valeur ===
    "archive"
    ? "archive"
    : "actif";
}

function nomClient(
  client: Client
) {
  const type =
    normaliserType(
      client.type_client
    );

  if (
    type ===
    "particulier"
  ) {
    const nom =
      `${client.prenom || ""} ${
        client.nom || ""
      }`.trim();

    return (
      nom ||
      "Client particulier"
    );
  }

  return (
    client.entreprise ||
    client.nom ||
    `${client.prenom || ""} ${
      client.nom || ""
    }`.trim() ||
    (
      type ===
      "collectivite"
        ? "Collectivité"
        : "Entreprise"
    )
  );
}

function libelleType(
  type:
    | string
    | null
    | undefined
) {
  if (
    type ===
    "entreprise"
  ) {
    return "Entreprise";
  }

  if (
    type ===
    "collectivite"
  ) {
    return "Collectivité";
  }

  return "Particulier";
}

function classeType(
  type:
    | string
    | null
    | undefined
) {
  return `clients-mobile-type clients-mobile-type-${normaliserType(
    type
  )}`;
}

function adresseComplete(
  adresse:
    | string
    | null,
  codePostal:
    | string
    | null,
  ville:
    | string
    | null
) {
  const ligneVille =
    [
      codePostal,
      ville,
    ]
      .filter(Boolean)
      .join(" ");

  return [
    adresse,
    ligneVille,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatDate(
  valeur:
    | string
    | null
    | undefined
) {
  if (!valeur) {
    return "—";
  }

  try {
    const date =
      valeur.includes(
        "T"
      )
        ? new Date(
            valeur
          )
        : new Date(
            `${valeur}T12:00:00`
          );

    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",
      }
    ).format(
      date
    );
  } catch {
    return valeur;
  }
}

function formatMontant(
  valeur:
    | number
    | null
    | undefined
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style:
        "currency",

      currency:
        "EUR",
    }
  ).format(
    Number(
      valeur ||
        0
    )
  );
}

function estAvoir(
  facture:
    FactureClient
) {
  return (
    facture.est_avoir ===
      true ||
    facture.type_facture ===
      "avoir"
  );
}

function libelleStatutDevis(
  statut:
    | string
    | null
) {
  if (
    statut ===
    "envoye"
  ) {
    return "Envoyé";
  }

  if (
    statut ===
    "accepte"
  ) {
    return "Accepté";
  }

  if (
    statut ===
    "facture"
  ) {
    return "Facturé";
  }

  if (
    statut ===
    "refuse"
  ) {
    return "Refusé";
  }

  if (
    statut ===
    "archive"
  ) {
    return "Archivé";
  }

  return "Brouillon";
}

function libelleStatutFacture(
  statut:
    | string
    | null
) {
  if (
    statut ===
    "envoyee"
  ) {
    return "Envoyée";
  }

  if (
    statut ===
    "en_retard"
  ) {
    return "En retard";
  }

  if (
    statut ===
    "payee"
  ) {
    return "Payée";
  }

  if (
    statut ===
    "annulee"
  ) {
    return "Annulée";
  }

  if (
    statut ===
    "archive"
  ) {
    return "Archivée";
  }

  return "Brouillon";
}

function formulaireDepuisClient(
  client: Client
): FormulaireClient {
  return {
    type_client:
      normaliserType(
        client.type_client
      ),

    nom:
      client.nom ||
      "",

    prenom:
      client.prenom ||
      "",

    entreprise:
      client.entreprise ||
      "",

    email:
      client.email ||
      "",

    telephone:
      client.telephone ||
      "",

    adresse:
      client.adresse ||
      "",

    code_postal:
      client.code_postal ||
      "",

    ville:
      client.ville ||
      "",

    adresse_chantier:
      client.adresse_chantier ||
      "",

    code_postal_chantier:
      client.code_postal_chantier ||
      "",

    ville_chantier:
      client.ville_chantier ||
      "",

    notes:
      client.notes ||
      "",

    notes_chantier:
      client.notes_chantier ||
      "",

    statut:
      normaliserStatut(
        client.statut
      ),
  };
}

export default function ClientsMobile({
  entrepriseId,
  onFermer,
}: Props) {
  const [
    clients,
    setClients,
  ] =
    useState<
      Client[]
    >([]);

  const [
    chargement,
    setChargement,
  ] =
    useState(
      true
    );

  const [
    enregistrement,
    setEnregistrement,
  ] =
    useState(
      false
    );

  const [
    chargementFiche,
    setChargementFiche,
  ] =
    useState(
      false
    );

  const [
    recherche,
    setRecherche,
  ] =
    useState(
      ""
    );

  const [
    filtreType,
    setFiltreType,
  ] =
    useState<FiltreType>(
      "tous"
    );

  const [
    filtreStatut,
    setFiltreStatut,
  ] =
    useState<FiltreStatut>(
      "actif"
    );

  const [
    clientSelectionne,
    setClientSelectionne,
  ] =
    useState<Client | null>(
      null
    );

  const [
    clientEdition,
    setClientEdition,
  ] =
    useState<Client | null>(
      null
    );

  const [
    formulaireOuvert,
    setFormulaireOuvert,
  ] =
    useState(
      false
    );

  const [
    formulaire,
    setFormulaire,
  ] =
    useState<FormulaireClient>(
      FORMULAIRE_VIDE
    );

  const [
    devisClient,
    setDevisClient,
  ] =
    useState<
      DevisClient[]
    >([]);

  const [
    facturesClient,
    setFacturesClient,
  ] =
    useState<
      FactureClient[]
    >([]);

  const [
    erreur,
    setErreur,
  ] =
    useState(
      ""
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      ""
    );

  useEffect(() => {
    void chargerClients();
  }, [
    entrepriseId,
  ]);

  async function chargerClients() {
    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "clients"
          )
          .select(
            `
              id,
              entreprise_id,
              type_client,
              nom,
              prenom,
              entreprise,
              email,
              telephone,
              adresse,
              code_postal,
              ville,
              adresse_chantier,
              code_postal_chantier,
              ville_chantier,
              notes,
              notes_chantier,
              statut,
              created_at,
              updated_at
            `
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      if (error) {
        throw error;
      }

      setClients(
        (
          data ||
          []
        ) as Client[]
      );
    } catch (error) {
      console.error(
        "Chargement clients mobile :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger les clients."
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  function modifierChamp<
    K extends keyof FormulaireClient
  >(
    champ: K,
    valeur:
      FormulaireClient[K]
  ) {
    setFormulaire(
      (
        ancien
      ) => ({
        ...ancien,
        [champ]:
          valeur,
      })
    );
  }

  function ouvrirCreation() {
    setClientEdition(
      null
    );

    setFormulaire(
      FORMULAIRE_VIDE
    );

    setErreur(
      ""
    );

    setMessage(
      ""
    );

    setFormulaireOuvert(
      true
    );
  }

  function ouvrirEdition(
    client: Client
  ) {
    setClientEdition(
      client
    );

    setFormulaire(
      formulaireDepuisClient(
        client
      )
    );

    setErreur(
      ""
    );

    setMessage(
      ""
    );

    setFormulaireOuvert(
      true
    );
  }

  function fermerFormulaire() {
    if (
      enregistrement
    ) {
      return;
    }

    setFormulaireOuvert(
      false
    );

    setClientEdition(
      null
    );

    setFormulaire(
      FORMULAIRE_VIDE
    );

    setErreur(
      ""
    );
  }

  function formulaireValide() {
    if (
      formulaire.type_client ===
      "particulier"
    ) {
      return (
        formulaire.nom
          .trim()
          .length >
          0 ||
        formulaire.prenom
          .trim()
          .length >
          0
      );
    }

    return (
      formulaire.entreprise
        .trim()
        .length >
        0 ||
      formulaire.nom
        .trim()
        .length >
        0
    );
  }

  function copierAdresseVersChantier() {
    setFormulaire(
      (
        ancien
      ) => ({
        ...ancien,

        adresse_chantier:
          ancien.adresse,

        code_postal_chantier:
          ancien.code_postal,

        ville_chantier:
          ancien.ville,
      })
    );
  }

  async function enregistrerClient() {
    if (
      !formulaireValide()
    ) {
      setErreur(
        formulaire.type_client ===
        "particulier"
          ? "Renseignez au minimum le nom ou le prénom du client."
          : "Renseignez au minimum le nom de l’entreprise ou de la collectivité."
      );

      return;
    }

    try {
      setEnregistrement(
        true
      );

      setErreur(
        ""
      );

      setMessage(
        ""
      );

      const payload = {
        entreprise_id:
          entrepriseId,

        type_client:
          formulaire.type_client,

        nom:
          nettoyerTexte(
            formulaire.nom
          ),

        prenom:
          nettoyerTexte(
            formulaire.prenom
          ),

        entreprise:
          nettoyerTexte(
            formulaire.entreprise
          ),

        email:
          nettoyerTexte(
            formulaire.email
          ),

        telephone:
          nettoyerTexte(
            formulaire.telephone
          ),

        adresse:
          nettoyerTexte(
            formulaire.adresse
          ),

        code_postal:
          nettoyerTexte(
            formulaire.code_postal
          ),

        ville:
          nettoyerTexte(
            formulaire.ville
          ),

        adresse_chantier:
          nettoyerTexte(
            formulaire.adresse_chantier
          ),

        code_postal_chantier:
          nettoyerTexte(
            formulaire.code_postal_chantier
          ),

        ville_chantier:
          nettoyerTexte(
            formulaire.ville_chantier
          ),

        notes:
          nettoyerTexte(
            formulaire.notes
          ),

        notes_chantier:
          nettoyerTexte(
            formulaire.notes_chantier
          ),

        statut:
          formulaire.statut,
      };

      if (
        clientEdition
      ) {
        const {
          error,
        } =
          await supabase
            .from(
              "clients"
            )
            .update(
              payload
            )
            .eq(
              "id",
              clientEdition.id
            )
            .eq(
              "entreprise_id",
              entrepriseId
            );

        if (error) {
          throw error;
        }

        setMessage(
          "Client modifié avec succès."
        );
      } else {
        const {
          error,
        } =
          await supabase
            .from(
              "clients"
            )
            .insert(
              payload
            );

        if (error) {
          throw error;
        }

        setMessage(
          "Client créé avec succès."
        );
      }

      setFormulaireOuvert(
        false
      );

      setClientEdition(
        null
      );

      setFormulaire(
        FORMULAIRE_VIDE
      );

      await chargerClients();
    } catch (error) {
      console.error(
        "Enregistrement client mobile :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer le client."
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  async function archiverOuRestaurer(
    client: Client
  ) {
    const archive =
      normaliserStatut(
        client.statut
      ) ===
      "archive";

    const nouveauStatut:
      StatutClient =
      archive
        ? "actif"
        : "archive";

    const confirmation =
      window.confirm(
        archive
          ? `Restaurer ${nomClient(
              client
            )} ?`
          : `Archiver ${nomClient(
              client
            )} ?`
      );

    if (
      !confirmation
    ) {
      return;
    }

    try {
      setErreur(
        ""
      );

      setMessage(
        ""
      );

      const {
        error,
      } =
        await supabase
          .from(
            "clients"
          )
          .update({
            statut:
              nouveauStatut,
          })
          .eq(
            "id",
            client.id
          )
          .eq(
            "entreprise_id",
            entrepriseId
          );

      if (error) {
        throw error;
      }

      setClients(
        (
          anciens
        ) =>
          anciens.map(
            (
              item
            ) =>
              item.id ===
              client.id
                ? {
                    ...item,
                    statut:
                      nouveauStatut,
                  }
                : item
          )
      );

      if (
        clientSelectionne?.id ===
        client.id
      ) {
        setClientSelectionne(
          {
            ...clientSelectionne,

            statut:
              nouveauStatut,
          }
        );
      }

      setMessage(
        nouveauStatut ===
        "archive"
          ? "Client archivé."
          : "Client restauré."
      );
    } catch (error) {
      console.error(
        "Archivage client mobile :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut du client."
      );
    }
  }

  async function ouvrirFiche(
    client: Client
  ) {
    try {
      setClientSelectionne(
        client
      );

      setDevisClient(
        []
      );

      setFacturesClient(
        []
      );

      setChargementFiche(
        true
      );

      setErreur(
        ""
      );

      setMessage(
        ""
      );

      const [
        devisResult,
        facturesResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "devis"
            )
            .select(
              `
                id,
                numero,
                objet,
                statut,
                date_devis,
                total_ttc
              `
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .eq(
              "client_id",
              client.id
            )
            .order(
              "date_devis",
              {
                ascending:
                  false,
              }
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            ),

          supabase
            .from(
              "factures"
            )
            .select(
              `
                id,
                numero,
                objet,
                statut,
                date_facture,
                date_echeance,
                total_ttc,
                montant_paye,
                reste_a_payer,
                est_avoir,
                type_facture
              `
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .eq(
              "client_id",
              client.id
            )
            .order(
              "date_facture",
              {
                ascending:
                  false,
              }
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            ),
        ]);

      if (
        devisResult.error
      ) {
        throw devisResult.error;
      }

      if (
        facturesResult.error
      ) {
        throw facturesResult.error;
      }

      setDevisClient(
        (
          devisResult.data ||
          []
        ) as DevisClient[]
      );

      setFacturesClient(
        (
          facturesResult.data ||
          []
        ) as FactureClient[]
      );
    } catch (error) {
      console.error(
        "Ouverture fiche client mobile :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger la fiche client."
      );
    } finally {
      setChargementFiche(
        false
      );
    }
  }

  function fermerFiche() {
    setClientSelectionne(
      null
    );

    setDevisClient(
      []
    );

    setFacturesClient(
      []
    );

    setErreur(
      ""
    );

    setMessage(
      ""
    );
  }

  const statistiques =
    useMemo(() => {
      const actifs =
        clients.filter(
          (
            client
          ) =>
            normaliserStatut(
              client.statut
            ) ===
            "actif"
        );

      return {
        total:
          actifs.length,

        particuliers:
          actifs.filter(
            (
              client
            ) =>
              normaliserType(
                client.type_client
              ) ===
              "particulier"
          ).length,

        entreprises:
          actifs.filter(
            (
              client
            ) =>
              normaliserType(
                client.type_client
              ) ===
              "entreprise"
          ).length,

        collectivites:
          actifs.filter(
            (
              client
            ) =>
              normaliserType(
                client.type_client
              ) ===
              "collectivite"
          ).length,
      };
    }, [
      clients,
    ]);

  const clientsFiltres =
    useMemo(() => {
      const texteRecherche =
        recherche
          .trim()
          .toLowerCase();

      return clients.filter(
        (
          client
        ) => {
          if (
            filtreStatut !==
              "tous" &&
            normaliserStatut(
              client.statut
            ) !==
              filtreStatut
          ) {
            return false;
          }

          if (
            filtreType !==
              "tous" &&
            normaliserType(
              client.type_client
            ) !==
              filtreType
          ) {
            return false;
          }

          if (
            !texteRecherche
          ) {
            return true;
          }

          const texte = [
            nomClient(
              client
            ),

            client.nom,
            client.prenom,
            client.entreprise,
            client.email,
            client.telephone,
            client.adresse,
            client.code_postal,
            client.ville,
            client.adresse_chantier,
            client.code_postal_chantier,
            client.ville_chantier,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return texte.includes(
            texteRecherche
          );
        }
      );
    }, [
      clients,
      filtreType,
      filtreStatut,
      recherche,
    ]);

  const statsFiche =
    useMemo(() => {
      const facturesNormales =
        facturesClient.filter(
          (
            facture
          ) =>
            !estAvoir(
              facture
            )
        );

      return {
        devis:
          devisClient.length,

        factures:
          facturesNormales.length,

        avoirs:
          facturesClient.filter(
            estAvoir
          ).length,

        factureTtc:
          facturesNormales.reduce(
            (
              total,
              facture
            ) =>
              total +
              Number(
                facture.total_ttc ||
                  0
              ),
            0
          ),

        paye:
          facturesNormales.reduce(
            (
              total,
              facture
            ) =>
              total +
              Number(
                facture.montant_paye ||
                  0
              ),
            0
          ),

        reste:
          facturesNormales.reduce(
            (
              total,
              facture
            ) =>
              total +
              Number(
                facture.reste_a_payer ||
                  0
              ),
            0
          ),
      };
    }, [
      devisClient,
      facturesClient,
    ]);

  /*
   * ======================================================
   * FORMULAIRE CLIENT
   * ======================================================
   */

  if (
    formulaireOuvert
  ) {
    const professionnel =
      formulaire.type_client !==
      "particulier";

    return (
      <main className="clients-mobile">
        <header className="clients-mobile-header">
          <button
            type="button"
            className="clients-mobile-back"
            onClick={
              fermerFormulaire
            }
            aria-label="Retour"
          >
            ‹
          </button>

          <div>
            <h1>
              {clientEdition
                ? "Modifier le client"
                : "Nouveau client"}
            </h1>

            <span>
              {clientEdition
                ? "Mettre à jour les informations"
                : "Création rapide"}
            </span>
          </div>

          <div className="clients-mobile-header-space" />
        </header>

        <div className="clients-mobile-form-content">
          {erreur ? (
            <div className="clients-mobile-error">
              {erreur}
            </div>
          ) : null}

          <section className="clients-mobile-form-card">
            <span className="clients-mobile-form-eyebrow">
              TYPE DE CLIENT
            </span>

            <div className="clients-mobile-type-selector">
              <button
                type="button"
                className={
                  formulaire.type_client ===
                  "particulier"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  modifierChamp(
                    "type_client",
                    "particulier"
                  )
                }
              >
                👤
                <span>
                  Particulier
                </span>
              </button>

              <button
                type="button"
                className={
                  formulaire.type_client ===
                  "entreprise"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  modifierChamp(
                    "type_client",
                    "entreprise"
                  )
                }
              >
                🏢
                <span>
                  Entreprise
                </span>
              </button>

              <button
                type="button"
                className={
                  formulaire.type_client ===
                  "collectivite"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  modifierChamp(
                    "type_client",
                    "collectivite"
                  )
                }
              >
                🏛
                <span>
                  Collectivité
                </span>
              </button>
            </div>
          </section>

          <section className="clients-mobile-form-card">
            <h2>
              Identité
            </h2>

            {professionnel ? (
              <label className="clients-mobile-field">
                <span>
                  {formulaire.type_client ===
                  "collectivite"
                    ? "Nom de la collectivité"
                    : "Nom de l’entreprise"}
                </span>

                <input
                  type="text"
                  value={
                    formulaire.entreprise
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "entreprise",
                      event.target.value
                    )
                  }
                  placeholder={
                    formulaire.type_client ===
                    "collectivite"
                      ? "Commune de..."
                      : "Nom de l’entreprise"
                  }
                />
              </label>
            ) : null}

            <div className="clients-mobile-field-grid">
              <label className="clients-mobile-field">
                <span>
                  Prénom
                </span>

                <input
                  type="text"
                  value={
                    formulaire.prenom
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "prenom",
                      event.target.value
                    )
                  }
                  placeholder="Jean"
                />
              </label>

              <label className="clients-mobile-field">
                <span>
                  Nom
                </span>

                <input
                  type="text"
                  value={
                    formulaire.nom
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "nom",
                      event.target.value
                    )
                  }
                  placeholder="Dupont"
                />
              </label>
            </div>
          </section>

          <section className="clients-mobile-form-card">
            <h2>
              Contact
            </h2>

            <label className="clients-mobile-field">
              <span>
                Téléphone
              </span>

              <input
                type="tel"
                inputMode="tel"
                value={
                  formulaire.telephone
                }
                onChange={(
                  event
                ) =>
                  modifierChamp(
                    "telephone",
                    event.target.value
                  )
                }
                placeholder="06 00 00 00 00"
              />
            </label>

            <label className="clients-mobile-field">
              <span>
                Adresse e-mail
              </span>

              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={
                  formulaire.email
                }
                onChange={(
                  event
                ) =>
                  modifierChamp(
                    "email",
                    event.target.value
                  )
                }
                placeholder="client@email.fr"
              />
            </label>
          </section>

          <section className="clients-mobile-form-card">
            <h2>
              Adresse
            </h2>

            <label className="clients-mobile-field">
              <span>
                Adresse
              </span>

              <input
                type="text"
                value={
                  formulaire.adresse
                }
                onChange={(
                  event
                ) =>
                  modifierChamp(
                    "adresse",
                    event.target.value
                  )
                }
                placeholder="12 rue..."
              />
            </label>

            <div className="clients-mobile-field-grid">
              <label className="clients-mobile-field">
                <span>
                  Code postal
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    formulaire.code_postal
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "code_postal",
                      event.target.value
                    )
                  }
                  placeholder="03000"
                />
              </label>

              <label className="clients-mobile-field">
                <span>
                  Ville
                </span>

                <input
                  type="text"
                  value={
                    formulaire.ville
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "ville",
                      event.target.value
                    )
                  }
                  placeholder="Moulins"
                />
              </label>
            </div>
          </section>

          <section className="clients-mobile-form-card">
            <div className="clients-mobile-form-card-title">
              <h2>
                Adresse chantier
              </h2>

              <button
                type="button"
                onClick={
                  copierAdresseVersChantier
                }
              >
                Copier l’adresse
              </button>
            </div>

            <label className="clients-mobile-field">
              <span>
                Adresse chantier
              </span>

              <input
                type="text"
                value={
                  formulaire.adresse_chantier
                }
                onChange={(
                  event
                ) =>
                  modifierChamp(
                    "adresse_chantier",
                    event.target.value
                  )
                }
                placeholder="Adresse du chantier"
              />
            </label>

            <div className="clients-mobile-field-grid">
              <label className="clients-mobile-field">
                <span>
                  Code postal
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    formulaire.code_postal_chantier
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "code_postal_chantier",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="clients-mobile-field">
                <span>
                  Ville
                </span>

                <input
                  type="text"
                  value={
                    formulaire.ville_chantier
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "ville_chantier",
                      event.target.value
                    )
                  }
                />
              </label>
            </div>
          </section>

          <section className="clients-mobile-form-card">
            <h2>
              Notes
            </h2>

            <label className="clients-mobile-field">
              <span>
                Notes client
              </span>

              <textarea
                rows={
                  4
                }
                value={
                  formulaire.notes
                }
                onChange={(
                  event
                ) =>
                  modifierChamp(
                    "notes",
                    event.target.value
                  )
                }
                placeholder="Informations utiles sur le client..."
              />
            </label>

            <label className="clients-mobile-field">
              <span>
                Notes chantier
              </span>

              <textarea
                rows={
                  4
                }
                value={
                  formulaire.notes_chantier
                }
                onChange={(
                  event
                ) =>
                  modifierChamp(
                    "notes_chantier",
                    event.target.value
                  )
                }
                placeholder="Accès, portail, contraintes, informations terrain..."
              />
            </label>
          </section>

          <div className="clients-mobile-form-actions">
            <button
              type="button"
              className="clients-mobile-primary"
              disabled={
                enregistrement
              }
              onClick={() =>
                void enregistrerClient()
              }
            >
              {enregistrement
                ? "Enregistrement…"
                : clientEdition
                  ? "✓ Enregistrer les modifications"
                  : "✓ Créer le client"}
            </button>

            <button
              type="button"
              className="clients-mobile-secondary"
              disabled={
                enregistrement
              }
              onClick={
                fermerFormulaire
              }
            >
              Annuler
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ======================================================
   * FICHE CLIENT
   * ======================================================
   */

  if (
    clientSelectionne
  ) {
    const adresse =
      adresseComplete(
        clientSelectionne.adresse,
        clientSelectionne.code_postal,
        clientSelectionne.ville
      );

    const adresseChantier =
      adresseComplete(
        clientSelectionne.adresse_chantier,
        clientSelectionne.code_postal_chantier,
        clientSelectionne.ville_chantier
      );

    const archive =
      normaliserStatut(
        clientSelectionne.statut
      ) ===
      "archive";

    return (
      <main className="clients-mobile">
        <header className="clients-mobile-header">
          <button
            type="button"
            className="clients-mobile-back"
            onClick={
              fermerFiche
            }
            aria-label="Retour"
          >
            ‹
          </button>

          <div>
            <h1>
              Fiche client
            </h1>

            <span>
              {libelleType(
                clientSelectionne.type_client
              )}
            </span>
          </div>

          <button
            type="button"
            className="clients-mobile-edit-header"
            onClick={() =>
              ouvrirEdition(
                clientSelectionne
              )
            }
            aria-label="Modifier"
          >
            ✎
          </button>
        </header>

        <div className="clients-mobile-detail-content">
          {erreur ? (
            <div className="clients-mobile-error">
              {erreur}
            </div>
          ) : null}

          {message ? (
            <div className="clients-mobile-success">
              {message}
            </div>
          ) : null}

          <section className="clients-mobile-profile-card">
            <div className="clients-mobile-avatar">
              {normaliserType(
                clientSelectionne.type_client
              ) ===
              "particulier"
                ? "👤"
                : normaliserType(
                      clientSelectionne.type_client
                    ) ===
                    "collectivite"
                  ? "🏛"
                  : "🏢"}
            </div>

            <div className="clients-mobile-profile-main">
              <span
                className={classeType(
                  clientSelectionne.type_client
                )}
              >
                {libelleType(
                  clientSelectionne.type_client
                )}
              </span>

              <h2>
                {nomClient(
                  clientSelectionne
                )}
              </h2>

              <small>
                {archive
                  ? "Client archivé"
                  : "Client actif"}
              </small>
            </div>
          </section>

          {(clientSelectionne.telephone ||
            clientSelectionne.email) ? (
            <section className="clients-mobile-contact-actions">
              {clientSelectionne.telephone ? (
                <a
                  href={`tel:${clientSelectionne.telephone}`}
                >
                  <span>
                    ☎
                  </span>

                  Appeler
                </a>
              ) : null}

              {clientSelectionne.email ? (
                <a
                  href={`mailto:${clientSelectionne.email}`}
                >
                  <span>
                    ✉
                  </span>

                  E-mail
                </a>
              ) : null}
            </section>
          ) : null}

          <section className="clients-mobile-detail-card">
            <h3>
              Coordonnées
            </h3>

            {clientSelectionne.telephone ? (
              <div className="clients-mobile-info-row">
                <span>
                  Téléphone
                </span>

                <strong>
                  {
                    clientSelectionne.telephone
                  }
                </strong>
              </div>
            ) : null}

            {clientSelectionne.email ? (
              <div className="clients-mobile-info-row">
                <span>
                  E-mail
                </span>

                <strong>
                  {
                    clientSelectionne.email
                  }
                </strong>
              </div>
            ) : null}

            {adresse ? (
              <div className="clients-mobile-info-row">
                <span>
                  Adresse
                </span>

                <strong>
                  {
                    adresse
                  }
                </strong>
              </div>
            ) : null}

            {!clientSelectionne.telephone &&
            !clientSelectionne.email &&
            !adresse ? (
              <div className="clients-mobile-no-data">
                Aucune coordonnée renseignée.
              </div>
            ) : null}
          </section>

          {adresseChantier ? (
            <section className="clients-mobile-detail-card">
              <h3>
                Chantier
              </h3>

              <div className="clients-mobile-site-address">
                <span>
                  📍
                </span>

                <strong>
                  {
                    adresseChantier
                  }
                </strong>
              </div>

              {clientSelectionne.notes_chantier ? (
                <p className="clients-mobile-notes">
                  {
                    clientSelectionne.notes_chantier
                  }
                </p>
              ) : null}
            </section>
          ) : null}

          {clientSelectionne.notes ? (
            <section className="clients-mobile-detail-card">
              <h3>
                Notes client
              </h3>

              <p className="clients-mobile-notes">
                {
                  clientSelectionne.notes
                }
              </p>
            </section>
          ) : null}

          <section className="clients-mobile-client-stats">
            <div>
              <strong>
                {
                  statsFiche.devis
                }
              </strong>

              <span>
                Devis
              </span>
            </div>

            <div>
              <strong>
                {
                  statsFiche.factures
                }
              </strong>

              <span>
                Factures
              </span>
            </div>

            <div>
              <strong>
                {
                  statsFiche.avoirs
                }
              </strong>

              <span>
                Avoirs
              </span>
            </div>
          </section>

          <section className="clients-mobile-finance-card">
            <div>
              <span>
                Facturé TTC
              </span>

              <strong>
                {formatMontant(
                  statsFiche.factureTtc
                )}
              </strong>
            </div>

            <div>
              <span>
                Payé
              </span>

              <strong>
                {formatMontant(
                  statsFiche.paye
                )}
              </strong>
            </div>

            <div className="clients-mobile-finance-rest">
              <span>
                Reste
              </span>

              <strong>
                {formatMontant(
                  statsFiche.reste
                )}
              </strong>
            </div>

            <small>
              Consultation uniquement sur mobile. La gestion des paiements reste sur la version web.
            </small>
          </section>

          <section className="clients-mobile-detail-card">
            <div className="clients-mobile-section-heading">
              <h3>
                Devis
              </h3>

              <span>
                {
                  devisClient.length
                }
              </span>
            </div>

            {chargementFiche ? (
              <div className="clients-mobile-loading-small">
                Chargement…
              </div>
            ) : devisClient.length ===
              0 ? (
              <div className="clients-mobile-no-data">
                Aucun devis pour ce client.
              </div>
            ) : (
              <div className="clients-mobile-documents">
                {devisClient
                  .slice(
                    0,
                    6
                  )
                  .map(
                    (
                      devis
                    ) => (
                      <div
                        className="clients-mobile-document-row"
                        key={
                          devis.id
                        }
                      >
                        <div>
                          <strong>
                            {devis.numero ||
                              "Devis"}
                          </strong>

                          <span>
                            {devis.objet ||
                              "Sans objet"}
                          </span>

                          <small>
                            {formatDate(
                              devis.date_devis
                            )}{" "}
                            •{" "}
                            {libelleStatutDevis(
                              devis.statut
                            )}
                          </small>
                        </div>

                        <b>
                          {formatMontant(
                            devis.total_ttc
                          )}
                        </b>
                      </div>
                    )
                  )}
              </div>
            )}
          </section>

          <section className="clients-mobile-detail-card">
            <div className="clients-mobile-section-heading">
              <h3>
                Factures
              </h3>

              <span>
                {
                  facturesClient.length
                }
              </span>
            </div>

            {chargementFiche ? (
              <div className="clients-mobile-loading-small">
                Chargement…
              </div>
            ) : facturesClient.length ===
              0 ? (
              <div className="clients-mobile-no-data">
                Aucune facture pour ce client.
              </div>
            ) : (
              <div className="clients-mobile-documents">
                {facturesClient
                  .slice(
                    0,
                    6
                  )
                  .map(
                    (
                      facture
                    ) => (
                      <div
                        className={`clients-mobile-document-row ${
                          estAvoir(
                            facture
                          )
                            ? "clients-mobile-document-credit"
                            : ""
                        }`}
                        key={
                          facture.id
                        }
                      >
                        <div>
                          <strong>
                            {facture.numero ||
                              (
                                estAvoir(
                                  facture
                                )
                                  ? "Avoir"
                                  : "Facture"
                              )}
                          </strong>

                          <span>
                            {facture.objet ||
                              "Sans objet"}
                          </span>

                          <small>
                            {formatDate(
                              facture.date_facture
                            )}{" "}
                            •{" "}
                            {estAvoir(
                              facture
                            )
                              ? "Avoir"
                              : libelleStatutFacture(
                                  facture.statut
                                )}
                          </small>
                        </div>

                        <b>
                          {formatMontant(
                            facture.total_ttc
                          )}
                        </b>
                      </div>
                    )
                  )}
              </div>
            )}
          </section>

          <div className="clients-mobile-detail-actions">
            <button
              type="button"
              className="clients-mobile-primary"
              onClick={() =>
                ouvrirEdition(
                  clientSelectionne
                )
              }
            >
              ✎ Modifier le client
            </button>

            <button
              type="button"
              className={
                archive
                  ? "clients-mobile-restore"
                  : "clients-mobile-danger"
              }
              onClick={() =>
                void archiverOuRestaurer(
                  clientSelectionne
                )
              }
            >
              {archive
                ? "↻ Restaurer le client"
                : "Archiver le client"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ======================================================
   * LISTE CLIENTS
   * ======================================================
   */

  return (
    <main className="clients-mobile">
      <header className="clients-mobile-header">
        <button
          type="button"
          className="clients-mobile-back"
          onClick={
            onFermer
          }
          aria-label="Retour"
        >
          ‹
        </button>

        <div>
          <h1>
            Clients
          </h1>

          <span>
            Carnet clients
          </span>
        </div>

        <button
          type="button"
          className="clients-mobile-add-header"
          onClick={
            ouvrirCreation
          }
          aria-label="Nouveau client"
        >
          ＋
        </button>
      </header>

      <div className="clients-mobile-content">
        {erreur ? (
          <div className="clients-mobile-error">
            {erreur}

            <button
              type="button"
              onClick={() =>
                void chargerClients()
              }
            >
              Réessayer
            </button>
          </div>
        ) : null}

        {message ? (
          <div className="clients-mobile-success">
            {message}
          </div>
        ) : null}

        <section className="clients-mobile-summary">
          <div className="clients-mobile-summary-main">
            <span>
              Clients actifs
            </span>

            <strong>
              {
                statistiques.total
              }
            </strong>
          </div>

          <div>
            <strong>
              {
                statistiques.particuliers
              }
            </strong>

            <span>
              Particuliers
            </span>
          </div>

          <div>
            <strong>
              {
                statistiques.entreprises
              }
            </strong>

            <span>
              Entreprises
            </span>
          </div>

          <div>
            <strong>
              {
                statistiques.collectivites
              }
            </strong>

            <span>
              Collectivités
            </span>
          </div>
        </section>

        <label className="clients-mobile-search">
          <span>
            🔎
          </span>

          <input
            type="search"
            placeholder="Nom, ville, téléphone..."
            value={
              recherche
            }
            onChange={(
              event
            ) =>
              setRecherche(
                event.target.value
              )
            }
          />
        </label>

        <div className="clients-mobile-filters">
          <button
            type="button"
            className={
              filtreType ===
              "tous"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreType(
                "tous"
              )
            }
          >
            Tous
          </button>

          <button
            type="button"
            className={
              filtreType ===
              "particulier"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreType(
                "particulier"
              )
            }
          >
            Particuliers
          </button>

          <button
            type="button"
            className={
              filtreType ===
              "entreprise"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreType(
                "entreprise"
              )
            }
          >
            Entreprises
          </button>

          <button
            type="button"
            className={
              filtreType ===
              "collectivite"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreType(
                "collectivite"
              )
            }
          >
            Collectivités
          </button>
        </div>

        <div className="clients-mobile-status-filter">
          <button
            type="button"
            className={
              filtreStatut ===
              "actif"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreStatut(
                "actif"
              )
            }
          >
            Actifs
          </button>

          <button
            type="button"
            className={
              filtreStatut ===
              "archive"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreStatut(
                "archive"
              )
            }
          >
            Archivés
          </button>

          <button
            type="button"
            className={
              filtreStatut ===
              "tous"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreStatut(
                "tous"
              )
            }
          >
            Tous
          </button>
        </div>

        <div className="clients-mobile-heading">
          <h2>
            {clientsFiltres.length}{" "}
            client
            {clientsFiltres.length >
            1
              ? "s"
              : ""}
          </h2>

          <button
            type="button"
            onClick={() =>
              void chargerClients()
            }
            aria-label="Actualiser"
          >
            ↻
          </button>
        </div>

        {chargement ? (
          <div className="clients-mobile-loading">
            <div className="clients-mobile-spinner" />

            <span>
              Chargement des clients…
            </span>
          </div>
        ) : clientsFiltres.length ===
          0 ? (
          <div className="clients-mobile-empty">
            <div>
              👥
            </div>

            <strong>
              Aucun client
            </strong>

            <span>
              Aucun client ne correspond aux filtres sélectionnés.
            </span>

            <button
              type="button"
              onClick={
                ouvrirCreation
              }
            >
              ＋ Ajouter un client
            </button>
          </div>
        ) : (
          <div className="clients-mobile-list">
            {clientsFiltres.map(
              (
                client
              ) => {
                const adresse =
                  adresseComplete(
                    client.adresse,
                    client.code_postal,
                    client.ville
                  );

                return (
                  <button
                    type="button"
                    className={`clients-mobile-card ${
                      normaliserStatut(
                        client.statut
                      ) ===
                      "archive"
                        ? "clients-mobile-card-archive"
                        : ""
                    }`}
                    key={
                      client.id
                    }
                    onClick={() =>
                      void ouvrirFiche(
                        client
                      )
                    }
                  >
                    <div className="clients-mobile-card-icon">
                      {normaliserType(
                        client.type_client
                      ) ===
                      "particulier"
                        ? "👤"
                        : normaliserType(
                              client.type_client
                            ) ===
                            "collectivite"
                          ? "🏛"
                          : "🏢"}
                    </div>

                    <div className="clients-mobile-card-main">
                      <div className="clients-mobile-card-title">
                        <strong>
                          {nomClient(
                            client
                          )}
                        </strong>

                        <span
                          className={classeType(
                            client.type_client
                          )}
                        >
                          {libelleType(
                            client.type_client
                          )}
                        </span>
                      </div>

                      {client.telephone ? (
                        <span>
                          ☎{" "}
                          {
                            client.telephone
                          }
                        </span>
                      ) : null}

                      {adresse ? (
                        <span>
                          📍{" "}
                          {
                            adresse
                          }
                        </span>
                      ) : null}
                    </div>

                    <b>
                      ›
                    </b>
                  </button>
                );
              }
            )}
          </div>
        )}

        <button
          type="button"
          className="clients-mobile-floating-add"
          onClick={
            ouvrirCreation
          }
        >
          ＋ Nouveau client
        </button>
      </div>
    </main>
  );
}