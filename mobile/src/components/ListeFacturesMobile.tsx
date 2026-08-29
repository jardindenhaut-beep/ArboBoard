import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import "./ListeFacturesMobile.css";

type Props = {
  entrepriseId: string;

  onFermer?: () => void;

  onActualiser?: () => void;

  [cle: string]: unknown;
};

type Client = {
  id: string;

  prenom:
    string | null;

  nom:
    string | null;

  entreprise:
    string | null;

  email:
    string | null;

  telephone:
    string | null;

  ville:
    string | null;
};

type Facture = {
  id: string;

  entreprise_id:
    string;

  client_id:
    string | null;

  client_nom:
    string | null;

  numero:
    string | null;

  objet:
    string | null;

  description:
    string | null;

  date_facture:
    string | null;

  date_echeance:
    string | null;

  statut:
    string | null;

  type_facture:
    string | null;

  est_avoir:
    boolean | null;

  total_ht:
    number | null;

  total_tva:
    number | null;

  total_ttc:
    number | null;

  montant_paye:
    number | null;

  reste_a_payer:
    number | null;

  created_at?:
    string | null;

  updated_at?:
    string | null;
};

type FactureAffiche =
  Facture & {
    client:
      Client | null;
  };

type Filtre =
  | "toutes"
  | "brouillon"
  | "envoyee"
  | "en_attente"
  | "en_retard"
  | "payee"
  | "avoir";

type Action =
  | {
      type:
        "pdf";

      factureId:
        string;
    }
  | {
      type:
        "email";

      factureId:
        string;
    }
  | null;

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

function nombre(
  valeur:
    unknown
) {
  const resultat =
    Number(
      valeur
    );

  return Number.isFinite(
    resultat
  )
    ? resultat
    : 0;
}

function formatMontant(
  valeur:
    unknown
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
    nombre(
      valeur
    )
  );
}

function formatDate(
  valeur:
    string | null | undefined
) {
  if (
    !valeur
  ) {
    return "—";
  }

  try {
    const date =
      new Date(
        valeur.length === 10
          ? `${valeur}T12:00:00`
          : valeur
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return valeur;
    }

    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day:
          "2-digit",

        month:
          "short",

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

function normaliser(
  valeur:
    string | null | undefined
) {
  return String(
    valeur ||
      ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toLowerCase();
}

function estAvoir(
  facture:
    Facture
) {
  return (
    Boolean(
      facture.est_avoir
    ) ||
    normaliser(
      facture.type_facture
    ) ===
      "avoir"
  );
}

function nomClient(
  facture:
    FactureAffiche
) {
  if (
    facture.client_nom?.trim()
  ) {
    return facture.client_nom.trim();
  }

  const client =
    facture.client;

  if (
    !client
  ) {
    return "Client";
  }

  if (
    client.entreprise?.trim()
  ) {
    return client.entreprise.trim();
  }

  const complet =
    `${client.prenom || ""} ${
      client.nom || ""
    }`.trim();

  return (
    complet ||
    "Client"
  );
}

function libelleStatut(
  facture:
    Facture
) {
  if (
    estAvoir(
      facture
    )
  ) {
    return "Avoir";
  }

  switch (
    normaliser(
      facture.statut
    )
  ) {
    case "brouillon":
      return "Brouillon";

    case "envoyee":
    case "envoye":
      return "Envoyée";

    case "en_attente":
    case "attente":
      return "En attente";

    case "en_retard":
      return "En retard";

    case "payee":
    case "paye":
      return "Payée";

    case "annulee":
      return "Annulée";

    case "archive":
      return "Archivée";

    default:
      return (
        facture.statut ||
        "Brouillon"
      );
  }
}

function classeStatut(
  facture:
    Facture
) {
  if (
    estAvoir(
      facture
    )
  ) {
    return "credit";
  }

  switch (
    normaliser(
      facture.statut
    )
  ) {
    case "payee":
    case "paye":
      return "paid";

    case "en_retard":
      return "late";

    case "envoyee":
    case "envoye":
      return "sent";

    case "en_attente":
    case "attente":
      return "waiting";

    case "annulee":
      return "cancelled";

    case "archive":
      return "archived";

    default:
      return "draft";
  }
}

function messageErreur(
  valeur:
    unknown,
  fallback:
    string
) {
  if (
    valeur instanceof
      Error &&
    valeur.message
  ) {
    return valeur.message;
  }

  if (
    valeur &&
    typeof valeur ===
      "object"
  ) {
    const objet =
      valeur as {
        error?:
          unknown;

        erreur?:
          unknown;

        message?:
          unknown;
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

  return fallback;
}

export default function ListeFacturesMobile({
  entrepriseId,
  onFermer,
  onActualiser,
}: Props) {
  const [
    factures,
    setFactures,
  ] =
    useState<
      FactureAffiche[]
    >([]);

  const [
    filtre,
    setFiltre,
  ] =
    useState<Filtre>(
      "toutes"
    );

  const [
    recherche,
    setRecherche,
  ] =
    useState(
      ""
    );

  const [
    chargement,
    setChargement,
  ] =
    useState(
      true
    );

  const [
    erreur,
    setErreur,
  ] =
    useState(
      ""
    );

  const [
    succes,
    setSucces,
  ] =
    useState(
      ""
    );

  const [
    action,
    setAction,
  ] =
    useState<Action>(
      null
    );

  const [
    factureEmailId,
    setFactureEmailId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    emailEnvoi,
    setEmailEnvoi,
  ] =
    useState(
      ""
    );

  useEffect(() => {
    void chargerFactures();
  }, [
    entrepriseId,
  ]);

  async function chargerFactures() {
    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      const {
        data:
          facturesData,
        error:
          facturesError,
      } =
        await supabase
          .from(
            "factures"
          )
          .select(
            `
              id,
              entreprise_id,
              client_id,
              client_nom,
              numero,
              objet,
              description,
              date_facture,
              date_echeance,
              statut,
              type_facture,
              est_avoir,
              total_ht,
              total_tva,
              total_ttc,
              montant_paye,
              reste_a_payer,
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

      if (
        facturesError
      ) {
        throw facturesError;
      }

      const listeFactures =
        (
          facturesData ||
          []
        ) as Facture[];

      const idsClients =
        Array.from(
          new Set(
            listeFactures
              .map(
                (
                  facture
                ) =>
                  facture.client_id
              )
              .filter(
                (
                  valeur
                ):
                  valeur is string =>
                    Boolean(
                      valeur
                    )
              )
          )
        );

      let clients:
        Client[] =
          [];

      if (
        idsClients.length >
        0
      ) {
        const {
          data:
            clientsData,
          error:
            clientsError,
        } =
          await supabase
            .from(
              "clients"
            )
            .select(
              `
                id,
                prenom,
                nom,
                entreprise,
                email,
                telephone,
                ville
              `
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .in(
              "id",
              idsClients
            );

        if (
          clientsError
        ) {
          throw clientsError;
        }

        clients =
          (
            clientsData ||
            []
          ) as Client[];
      }

      const mapClients =
        new Map(
          clients.map(
            (
              client
            ) => [
              client.id,
              client,
            ]
          )
        );

      const liste:
        FactureAffiche[] =
          listeFactures.map(
            (
              facture
            ) => ({
              ...facture,

              client:
                facture.client_id
                  ? mapClients.get(
                      facture.client_id
                    ) ||
                    null
                  : null,
            })
          );

      setFactures(
        liste
      );

      onActualiser?.();
    } catch (
      error
    ) {
      console.error(
        "Chargement factures mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger les factures."
        )
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  const statistiques =
    useMemo(
      () => {
        let totalTtc =
          0;

        let totalPaye =
          0;

        let totalRestant =
          0;

        let retard =
          0;

        factures.forEach(
          (
            facture
          ) => {
            if (
              estAvoir(
                facture
              )
            ) {
              return;
            }

            totalTtc +=
              nombre(
                facture.total_ttc
              );

            totalPaye +=
              nombre(
                facture.montant_paye
              );

            totalRestant +=
              nombre(
                facture.reste_a_payer
              );

            if (
              normaliser(
                facture.statut
              ) ===
              "en_retard"
            ) {
              retard +=
                1;
            }
          }
        );

        return {
          totalTtc,

          totalPaye,

          totalRestant,

          retard,

          total:
            factures.length,

          avoirs:
            factures.filter(
              (
                facture
              ) =>
                estAvoir(
                  facture
                )
            ).length,
        };
      },
      [
        factures,
      ]
    );

  const facturesFiltrees =
    useMemo(
      () => {
        const terme =
          normaliser(
            recherche
          );

        return factures.filter(
          (
            facture
          ) => {
            const statut =
              normaliser(
                facture.statut
              );

            const avoir =
              estAvoir(
                facture
              );

            if (
              filtre ===
                "avoir" &&
              !avoir
            ) {
              return false;
            }

            if (
              filtre !==
                "toutes" &&
              filtre !==
                "avoir"
            ) {
              if (
                filtre ===
                  "envoyee"
              ) {
                if (
                  statut !==
                    "envoyee" &&
                  statut !==
                    "envoye"
                ) {
                  return false;
                }
              } else if (
                filtre ===
                "payee"
              ) {
                if (
                  statut !==
                    "payee" &&
                  statut !==
                    "paye"
                ) {
                  return false;
                }
              } else if (
                statut !==
                filtre
              ) {
                return false;
              }
            }

            if (
              !terme
            ) {
              return true;
            }

            const texte =
              normaliser(
                [
                  facture.numero,
                  nomClient(
                    facture
                  ),
                  facture.objet,
                  facture.description,
                  facture.client
                    ?.email,
                  facture.client
                    ?.telephone,
                  facture.client
                    ?.ville,
                  libelleStatut(
                    facture
                  ),
                ]
                  .filter(Boolean)
                  .join(" ")
              );

            return texte.includes(
              terme
            );
          }
        );
      },
      [
        factures,
        filtre,
        recherche,
      ]
    );

  async function obtenirSession() {
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

    if (
      !session?.access_token
    ) {
      throw new Error(
        "Session Arboboard expirée. Reconnectez-vous."
      );
    }

    return session;
  }

  async function recupererPdf(
    facture:
      FactureAffiche
  ) {
    const session =
      await obtenirSession();

    const typeDocument =
      estAvoir(
        facture
      )
        ? "avoir"
        : "facture";

    const response =
      await fetch(
        `${API_ARBOBOARD}/api/documents/pdf`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${session.access_token}`,

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

              documentId:
                facture.id,

              mode:
                "inline",
            }),
        }
      );

    if (
      !response.ok
    ) {
      const donnees =
        await response
          .json()
          .catch(
            () => null
          );

      throw new Error(
        messageErreur(
          donnees,
          "Impossible de générer le PDF."
        )
      );
    }

    return response.blob();
  }

  function actionEnCours(
    type:
      "pdf" |
      "email",
    factureId:
      string
  ) {
    return (
      action?.type ===
        type &&
      action.factureId ===
        factureId
    );
  }

  async function voirPdf(
    facture:
      FactureAffiche
  ) {
    try {
      setAction({
        type:
          "pdf",

        factureId:
          facture.id,
      });

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const blob =
        await recupererPdf(
          facture
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const fenetre =
        window.open(
          url,
          "_blank"
        );

      if (
        !fenetre
      ) {
        const lien =
          document.createElement(
            "a"
          );

        lien.href =
          url;

        lien.target =
          "_blank";

        lien.rel =
          "noopener";

        document.body.appendChild(
          lien
        );

        lien.click();

        lien.remove();
      }

      window.setTimeout(
        () => {
          URL.revokeObjectURL(
            url
          );
        },
        60000
      );
    } catch (
      error
    ) {
      setErreur(
        messageErreur(
          error,
          "Impossible d’ouvrir le PDF."
        )
      );
    } finally {
      setAction(
        null
      );
    }
  }

  function ouvrirEmail(
    facture:
      FactureAffiche
  ) {
    setErreur(
      ""
    );

    setSucces(
      ""
    );

    setFactureEmailId(
      facture.id
    );

    setEmailEnvoi(
      facture.client
        ?.email ||
      ""
    );
  }

  function fermerEmail() {
    if (
      action?.type ===
      "email"
    ) {
      return;
    }

    setFactureEmailId(
      null
    );

    setEmailEnvoi(
      ""
    );
  }

  async function envoyerEmail(
    facture:
      FactureAffiche
  ) {
    const email =
      emailEnvoi
        .trim()
        .toLowerCase();

    if (
      !email
    ) {
      setErreur(
        "Renseignez l’adresse e-mail du client."
      );

      return;
    }

    try {
      setAction({
        type:
          "email",

        factureId:
          facture.id,
      });

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const session =
        await obtenirSession();

      const avoir =
        estAvoir(
          facture
        );

      const typeDocument =
        avoir
          ? "avoir"
          : "facture";

      const numero =
        facture.numero ||
        (
          avoir
            ? "votre avoir"
            : "votre facture"
        );

      const response =
        await fetch(
          `${API_ARBOBOARD}/api/documents/envoyer-email`,
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

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

                documentId:
                  facture.id,

                email,

                sujet:
                  avoir
                    ? `Votre avoir ${numero}`
                    : `Votre facture ${numero}`,

                message:
                  avoir
                    ? `Bonjour,\n\nVeuillez trouver ci-joint votre avoir ${numero}.\n\nCordialement.`
                    : `Bonjour,\n\nVeuillez trouver ci-joint votre facture ${numero}.\n\nCordialement.`,
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
            "Impossible d’envoyer le document."
          )
        );
      }

      setSucces(
        avoir
          ? `Avoir ${numero} envoyé à ${email}.`
          : `Facture ${numero} envoyée à ${email}.`
      );

      setFactureEmailId(
        null
      );

      setEmailEnvoi(
        ""
      );

      await chargerFactures();
    } catch (
      error
    ) {
      setErreur(
        messageErreur(
          error,
          "Impossible d’envoyer le document."
        )
      );
    } finally {
      setAction(
        null
      );
    }
  }

  return (
    <main className="liste-factures-mobile">
      <header className="liste-factures-mobile-header">
        <button
          type="button"
          className="liste-factures-mobile-back"
          onClick={() =>
            onFermer?.()
          }
          aria-label="Retour"
        >
          ‹
        </button>

        <div>
          <small>
            DOCUMENTS
          </small>

          <h1>
            Factures
          </h1>
        </div>

        <button
          type="button"
          className="liste-factures-mobile-refresh"
          onClick={() =>
            void chargerFactures()
          }
          disabled={
            chargement
          }
          aria-label="Actualiser"
        >
          ↻
        </button>
      </header>

      <section className="liste-factures-mobile-content">
        <section className="liste-factures-mobile-intro">
          <small>
            SUIVI FACTURATION
          </small>

          <h2>
            Vos factures
          </h2>

          <p>
            Consultez l’état de vos factures et envoyez-les à vos clients.
          </p>
        </section>

        {erreur ? (
          <div
            className="liste-factures-mobile-error"
            role="alert"
          >
            {erreur}
          </div>
        ) : null}

        {succes ? (
          <div
            className="liste-factures-mobile-success"
            role="status"
          >
            {succes}
          </div>
        ) : null}

        <section className="liste-factures-mobile-summary">
          <article>
            <small>
              FACTURÉ
            </small>

            <strong>
              {formatMontant(
                statistiques.totalTtc
              )}
            </strong>
          </article>

          <article>
            <small>
              PAYÉ
            </small>

            <strong>
              {formatMontant(
                statistiques.totalPaye
              )}
            </strong>
          </article>

          <article className="remaining">
            <small>
              RESTE À PAYER
            </small>

            <strong>
              {formatMontant(
                statistiques.totalRestant
              )}
            </strong>
          </article>
        </section>

        <div className="liste-factures-mobile-web-info">
          <span>
            ℹ
          </span>

          <p>
            L’enregistrement et la gestion des paiements se font uniquement sur Arboboard Web.
          </p>
        </div>

        <label className="liste-factures-mobile-search">
          <span>
            🔎
          </span>

          <input
            type="search"
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
            placeholder="Numéro, client, objet..."
          />
        </label>

        <div className="liste-factures-mobile-filters">
          <button
            type="button"
            className={
              filtre ===
              "toutes"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "toutes"
              )
            }
          >
            Toutes
            <span>
              {statistiques.total}
            </span>
          </button>

          <button
            type="button"
            className={
              filtre ===
              "envoyee"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "envoyee"
              )
            }
          >
            Envoyées
          </button>

          <button
            type="button"
            className={
              filtre ===
              "en_retard"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "en_retard"
              )
            }
          >
            En retard
            <span>
              {statistiques.retard}
            </span>
          </button>

          <button
            type="button"
            className={
              filtre ===
              "payee"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "payee"
              )
            }
          >
            Payées
          </button>

          <button
            type="button"
            className={
              filtre ===
              "avoir"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "avoir"
              )
            }
          >
            Avoirs
            <span>
              {statistiques.avoirs}
            </span>
          </button>
        </div>

        {chargement ? (
          <div className="liste-factures-mobile-loading">
            <div className="liste-factures-mobile-spinner" />

            <strong>
              Chargement des factures…
            </strong>
          </div>
        ) : facturesFiltrees.length ===
          0 ? (
          <section className="liste-factures-mobile-empty">
            <span>
              €
            </span>

            <h3>
              Aucune facture
            </h3>

            <p>
              Aucun document ne correspond à cette recherche.
            </p>
          </section>
        ) : (
          <div className="liste-factures-mobile-list">
            {facturesFiltrees.map(
              (
                facture
              ) => {
                const avoir =
                  estAvoir(
                    facture
                  );

                const emailOuvert =
                  factureEmailId ===
                  facture.id;

                const montantPaye =
                  nombre(
                    facture.montant_paye
                  );

                const reste =
                  nombre(
                    facture.reste_a_payer
                  );

                return (
                  <article
                    key={
                      facture.id
                    }
                    className="liste-factures-mobile-card"
                  >
                    <div className="liste-factures-mobile-card-head">
                      <div>
                        <small>
                          {facture.numero ||
                            "FACTURE"}
                        </small>

                        <h3>
                          {nomClient(
                            facture
                          )}
                        </h3>
                      </div>

                      <span
                        className={`liste-factures-mobile-status ${classeStatut(
                          facture
                        )}`}
                      >
                        {libelleStatut(
                          facture
                        )}
                      </span>
                    </div>

                    {facture.objet ? (
                      <p className="liste-factures-mobile-object">
                        {facture.objet}
                      </p>
                    ) : null}

                    <div className="liste-factures-mobile-main-amount">
                      <small>
                        {avoir
                          ? "MONTANT DE L’AVOIR"
                          : "TOTAL TTC"}
                      </small>

                      <strong>
                        {formatMontant(
                          facture.total_ttc
                        )}
                      </strong>
                    </div>

                    <div className="liste-factures-mobile-dates">
                      <div>
                        <small>
                          DATE
                        </small>

                        <strong>
                          {formatDate(
                            facture.date_facture
                          )}
                        </strong>
                      </div>

                      {!avoir ? (
                        <div>
                          <small>
                            ÉCHÉANCE
                          </small>

                          <strong>
                            {formatDate(
                              facture.date_echeance
                            )}
                          </strong>
                        </div>
                      ) : null}
                    </div>

                    {!avoir ? (
                      <section className="liste-factures-mobile-payment-readonly">
                        <div>
                          <small>
                            PAYÉ
                          </small>

                          <strong>
                            {formatMontant(
                              montantPaye
                            )}
                          </strong>
                        </div>

                        <div className="remaining">
                          <small>
                            RESTE
                          </small>

                          <strong>
                            {formatMontant(
                              reste
                            )}
                          </strong>
                        </div>
                      </section>
                    ) : null}

                    <div className="liste-factures-mobile-actions">
                      <button
                        type="button"
                        disabled={
                          action !==
                          null
                        }
                        onClick={() =>
                          void voirPdf(
                            facture
                          )
                        }
                      >
                        <span>
                          📄
                        </span>

                        <strong>
                          {actionEnCours(
                            "pdf",
                            facture.id
                          )
                            ? "Ouverture…"
                            : "Voir PDF"}
                        </strong>
                      </button>

                      <button
                        type="button"
                        disabled={
                          action !==
                          null
                        }
                        onClick={() =>
                          emailOuvert
                            ? fermerEmail()
                            : ouvrirEmail(
                                facture
                              )
                        }
                      >
                        <span>
                          ✉️
                        </span>

                        <strong>
                          Envoyer
                        </strong>
                      </button>
                    </div>

                    {emailOuvert ? (
                      <section className="liste-factures-mobile-email">
                        <label>
                          <span>
                            Email du client
                          </span>

                          <input
                            type="email"
                            inputMode="email"
                            value={
                              emailEnvoi
                            }
                            onChange={(
                              event
                            ) =>
                              setEmailEnvoi(
                                event.target.value
                              )
                            }
                            placeholder="client@email.fr"
                          />
                        </label>

                        <div>
                          <button
                            type="button"
                            className="cancel"
                            disabled={
                              action !==
                              null
                            }
                            onClick={
                              fermerEmail
                            }
                          >
                            Annuler
                          </button>

                          <button
                            type="button"
                            className="send"
                            disabled={
                              action !==
                                null ||
                              !emailEnvoi.trim()
                            }
                            onClick={() =>
                              void envoyerEmail(
                                facture
                              )
                            }
                          >
                            {actionEnCours(
                              "email",
                              facture.id
                            )
                              ? "Envoi…"
                              : avoir
                                ? "Envoyer l’avoir"
                                : "Envoyer la facture"}
                          </button>
                        </div>
                      </section>
                    ) : null}
                  </article>
                );
              }
            )}
          </div>
        )}

        <button
          type="button"
          className="liste-factures-mobile-bottom-refresh"
          disabled={
            chargement
          }
          onClick={() =>
            void chargerFactures()
          }
        >
          ↻ Actualiser les factures
        </button>
      </section>
    </main>
  );
}