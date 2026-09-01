import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Capacitor,
} from "@capacitor/core";

import {
  Directory,
  Filesystem,
} from "@capacitor/filesystem";

import {
  FileViewer,
} from "@capacitor/file-viewer";

import {
  Share,
} from "@capacitor/share";

import {
  supabase,
} from "../lib/supabase";

import {
  transformerDevisEnFactureMobile,
} from "../lib/transformerDevisEnFactureMobile";

import "./ListeDevisMobile.css";

type Props = {
  entrepriseId: string;

  onFermer?: () => void;

  onNouveauDevis?: () => void;

  onDevisCree?: () => void;

  onFactureCree?: (
    factureId?: string,
    numero?: string
  ) => void;

  onOuvrirFactures?: () => void;

  [cle: string]: unknown;
};

type Devis = {
  id: string;

  entreprise_id: string;

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

  date_devis:
    string | null;

  date_validite:
    string | null;

  statut:
    string | null;

  total_ht:
    number | null;

  total_tva:
    number | null;

  total_ttc:
    number | null;

  created_at?:
    string | null;

  updated_at?:
    string | null;
};

type Client = {
  id: string;

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

  ville:
    string | null;
};

type DevisAffiche =
  Devis & {
    client:
      Client | null;
  };

type Filtre =
  | "tous"
  | "brouillon"
  | "envoye"
  | "accepte"
  | "facture"
  | "refuse"
  | "archive";

type Action =
  | {
      type:
        "pdf";

      devisId:
        string;
    }
  | {
      type:
        "email";

      devisId:
        string;
    }
  | {
      type:
        "facture";

      devisId:
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
  valeur: unknown
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
        valeur.length ===
        10
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

function nomClient(
  devis:
    DevisAffiche
) {
  if (
    devis.client_nom?.trim()
  ) {
    return devis.client_nom.trim();
  }

  const client =
    devis.client;

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

  const nom =
    `${client.prenom || ""} ${
      client.nom || ""
    }`.trim();

  return (
    nom ||
    "Client"
  );
}

function libelleStatut(
  statut:
    string | null | undefined
) {
  switch (
    normaliser(
      statut
    )
  ) {
    case "brouillon":
      return "Brouillon";

    case "envoye":
      return "Envoyé";

    case "accepte":
      return "Accepté";

    case "facture":
      return "Facturé";

    case "refuse":
      return "Refusé";

    case "archive":
      return "Archivé";

    default:
      return (
        statut ||
        "Brouillon"
      );
  }
}

function classeStatut(
  statut:
    string | null | undefined
) {
  switch (
    normaliser(
      statut
    )
  ) {
    case "accepte":
      return "accepted";

    case "facture":
      return "invoiced";

    case "envoye":
      return "sent";

    case "refuse":
      return "refused";

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
        message?:
          unknown;

        error?:
          unknown;

        erreur?:
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

async function blobVersBase64(
  blob:
    Blob
) {
  return new Promise<string>(
    (
      resolve,
      reject
    ) => {
      const lecteur =
        new FileReader();

      lecteur.onloadend =
        () => {
          const resultat =
            String(
              lecteur.result ||
                ""
            );

          const virgule =
            resultat.indexOf(
              ","
            );

          if (
            virgule === -1
          ) {
            reject(
              new Error(
                "Impossible de convertir le PDF."
              )
            );

            return;
          }

          resolve(
            resultat.slice(
              virgule + 1
            )
          );
        };

      lecteur.onerror =
        () => {
          reject(
            lecteur.error ||
              new Error(
                "Impossible de lire le PDF."
              )
          );
        };

      lecteur.readAsDataURL(
        blob
      );
    }
  );
}

async function ouvrirPdf(
  blob:
    Blob,
  nomFichier:
    string,
  dossier:
    string,
  titre:
    string,
  texte:
    string
) {
  if (
    Capacitor.isNativePlatform()
  ) {
    const nomSecurise =
      nomFichier
        .replace(
          /[\/\:*?"<>|]/g,
          "-"
        )
        .trim() ||
      "document.pdf";

    const base64 =
      await blobVersBase64(
        blob
      );

    const fichier =
      await Filesystem.writeFile({
        path:
          `${dossier}/${nomSecurise}`,

        data:
          base64,

        directory:
          Directory.Cache,

        recursive:
          true,
      });

    const cheminLocal =
      decodeURIComponent(
        new URL(
          fichier.uri
        ).pathname
      );

    try {
      await FileViewer.openDocumentFromLocalPath({
        path:
          cheminLocal,
      });
    } catch (
      erreurOuverture
    ) {
      console.warn(
        "Ouverture native PDF impossible, utilisation du partage :",
        erreurOuverture
      );

      await Share.share({
        title:
          titre,

        text:
          texte,

        files: [
          fichier.uri,
        ],

        dialogTitle:
          "Ouvrir ou enregistrer le PDF",
      });
    }

    return;
  }

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
    60_000
  );
}

export default function ListeDevisMobile({
  entrepriseId,
  onFermer,
  onNouveauDevis,
  onFactureCree,
  onOuvrirFactures,
}: Props) {
  const [
    devis,
    setDevis,
  ] =
    useState<
      DevisAffiche[]
    >([]);

  const [
    recherche,
    setRecherche,
  ] =
    useState(
      ""
    );

  const [
    filtre,
    setFiltre,
  ] =
    useState<Filtre>(
      "tous"
    );

  const [
    chargement,
    setChargement,
  ] =
    useState(
      true
    );

  const [
    action,
    setAction,
  ] =
    useState<Action>(
      null
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
    devisEmailId,
    setDevisEmailId,
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
    void chargerDevis();
  }, [
    entrepriseId,
  ]);

  async function chargerDevis() {
    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      const {
        data:
          devisData,
        error:
          devisError,
      } =
        await supabase
          .from(
            "devis"
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
              date_devis,
              date_validite,
              statut,
              total_ht,
              total_tva,
              total_ttc,
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
        devisError
      ) {
        throw devisError;
      }

      const listeDevis =
        (
          devisData ||
          []
        ) as Devis[];

      const idsClients =
        Array.from(
          new Set(
            listeDevis
              .map(
                (
                  item
                ) =>
                  item.client_id
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
        Client[] = [];

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
                nom,
                prenom,
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
        DevisAffiche[] =
          listeDevis.map(
            (
              item
            ) => ({
              ...item,

              client:
                item.client_id
                  ? mapClients.get(
                      item.client_id
                    ) ||
                    null
                  : null,
            })
          );

      setDevis(
        liste
      );
    } catch (
      error
    ) {
      console.error(
        "Chargement devis mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger les devis."
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
      () => ({
        tous:
          devis.length,

        brouillon:
          devis.filter(
            (
              item
            ) =>
              normaliser(
                item.statut
              ) ===
              "brouillon"
          ).length,

        envoye:
          devis.filter(
            (
              item
            ) =>
              normaliser(
                item.statut
              ) ===
              "envoye"
          ).length,

        accepte:
          devis.filter(
            (
              item
            ) =>
              normaliser(
                item.statut
              ) ===
              "accepte"
          ).length,

        facture:
          devis.filter(
            (
              item
            ) =>
              normaliser(
                item.statut
              ) ===
              "facture"
          ).length,

        refuse:
          devis.filter(
            (
              item
            ) =>
              normaliser(
                item.statut
              ) ===
              "refuse"
          ).length,

        archive:
          devis.filter(
            (
              item
            ) =>
              normaliser(
                item.statut
              ) ===
              "archive"
          ).length,
      }),
      [
        devis,
      ]
    );

  const devisFiltres =
    useMemo(
      () => {
        const terme =
          normaliser(
            recherche
          );

        return devis.filter(
          (
            item
          ) => {
            if (
              filtre !==
                "tous" &&
              normaliser(
                item.statut
              ) !==
                filtre
            ) {
              return false;
            }

            if (
              !terme
            ) {
              return true;
            }

            const texte =
              normaliser(
                [
                  item.numero,
                  nomClient(
                    item
                  ),
                  item.objet,
                  item.description,
                  item.client
                    ?.email,
                  item.client
                    ?.telephone,
                  item.client
                    ?.ville,
                  libelleStatut(
                    item.statut
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
        devis,
        filtre,
        recherche,
      ]
    );

  function actionEnCours(
    type:
      "pdf" |
      "email" |
      "facture",
    devisId:
      string
  ) {
    return (
      action?.type ===
        type &&
      action.devisId ===
        devisId
    );
  }

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
    devisId:
      string
  ) {
    const session =
      await obtenirSession();

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
              typeDocument:
                "devis",

              documentId:
                devisId,

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
          "Impossible de générer le PDF du devis."
        )
      );
    }

    return response.blob();
  }

  async function voirPdf(
    item:
      DevisAffiche
  ) {
    try {
      setAction({
        type:
          "pdf",

        devisId:
          item.id,
      });

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const blob =
        await recupererPdf(
          item.id
        );

      const numero =
        item.numero?.trim() ||
        "devis";

      await ouvrirPdf(
        blob,
        `${numero}.pdf`,
        "arboboard-devis",
        `Devis ${numero}`,
        `Devis ${numero} Arboboard`
      );
    } catch (
      error
    ) {
      setErreur(
        messageErreur(
          error,
          "Impossible d’ouvrir le devis."
        )
      );
    } finally {
      setAction(
        null
      );
    }
  }

  function ouvrirEnvoiEmail(
    item:
      DevisAffiche
  ) {
    setErreur(
      ""
    );

    setSucces(
      ""
    );

    setDevisEmailId(
      item.id
    );

    setEmailEnvoi(
      item.client
        ?.email ||
      ""
    );
  }

  function fermerEnvoiEmail() {
    if (
      action?.type ===
      "email"
    ) {
      return;
    }

    setDevisEmailId(
      null
    );

    setEmailEnvoi(
      ""
    );
  }

  async function envoyerEmail(
    item:
      DevisAffiche
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

        devisId:
          item.id,
      });

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const session =
        await obtenirSession();

      const numero =
        item.numero ||
        "votre devis";

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
                typeDocument:
                  "devis",

                documentId:
                  item.id,

                email,

                sujet:
                  `Votre devis ${numero}`,

                message:
                  `Bonjour,\n\nVeuillez trouver ci-joint votre devis ${numero}.\n\nCordialement.`,
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
            "Impossible d’envoyer le devis."
          )
        );
      }

      setSucces(
        `Devis ${numero} envoyé à ${email}.`
      );

      setDevisEmailId(
        null
      );

      setEmailEnvoi(
        ""
      );

      /*
       * La route serveur peut modifier
       * le statut du document.
       * On recharge donc systématiquement
       * la vraie donnée Supabase.
       */
      await chargerDevis();
    } catch (
      error
    ) {
      setErreur(
        messageErreur(
          error,
          "Impossible d’envoyer le devis."
        )
      );
    } finally {
      setAction(
        null
      );
    }
  }

  async function transformerEnFacture(
    item:
      DevisAffiche
  ) {
    if (
      normaliser(
        item.statut
      ) !==
      "accepte"
    ) {
      setErreur(
        "Seul un devis accepté peut être transformé en facture."
      );

      return;
    }

    const confirmation =
      window.confirm(
        `Créer la facture à partir du devis ${
          item.numero ||
          ""
        } ?`
      );

    if (
      !confirmation
    ) {
      return;
    }

    try {
      setAction({
        type:
          "facture",

        devisId:
          item.id,
      });

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const resultat =
        await transformerDevisEnFactureMobile(
          item.id
        );

      setSucces(
        resultat.message ||
        `Facture ${resultat.numero} créée avec succès.`
      );

      /*
       * Le serveur fait lui-même passer
       * le devis en statut "facture".
       */
      await chargerDevis();

      onFactureCree?.(
        resultat.factureId,
        resultat.numero
      );
    } catch (
      error
    ) {
      setErreur(
        messageErreur(
          error,
          "Impossible de transformer le devis en facture."
        )
      );
    } finally {
      setAction(
        null
      );
    }
  }

  function revenir() {
    onFermer?.();
  }

  return (
    <main className="liste-devis-mobile">
      <header className="liste-devis-mobile-header">
        <button
          type="button"
          className="liste-devis-mobile-back"
          onClick={
            revenir
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
            Devis
          </h1>
        </div>

        <button
          type="button"
          className="liste-devis-mobile-refresh"
          onClick={() =>
            void chargerDevis()
          }
          disabled={
            chargement
          }
          aria-label="Actualiser les devis"
        >
          ↻
        </button>
      </header>

      <section className="liste-devis-mobile-content">
        <div className="liste-devis-mobile-top">
          <div>
            <small>
              SUIVI COMMERCIAL
            </small>

            <h2>
              Vos devis
            </h2>

            <p>
              Retrouvez, envoyez et transformez vos devis depuis le mobile.
            </p>
          </div>

          {onNouveauDevis ? (
            <button
              type="button"
              className="liste-devis-mobile-new"
              onClick={
                onNouveauDevis
              }
            >
              ＋ Nouveau
            </button>
          ) : null}
        </div>

        {erreur ? (
          <div
            className="liste-devis-mobile-error"
            role="alert"
          >
            {erreur}
          </div>
        ) : null}

        {succes ? (
          <div
            className="liste-devis-mobile-success"
            role="status"
          >
            {succes}
          </div>
        ) : null}

        <label className="liste-devis-mobile-search">
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

        <div className="liste-devis-mobile-filters">
          <button
            type="button"
            className={
              filtre ===
              "tous"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "tous"
              )
            }
          >
            Tous
            <span>
              {statistiques.tous}
            </span>
          </button>

          <button
            type="button"
            className={
              filtre ===
              "brouillon"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "brouillon"
              )
            }
          >
            Brouillons
            <span>
              {statistiques.brouillon}
            </span>
          </button>

          <button
            type="button"
            className={
              filtre ===
              "envoye"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "envoye"
              )
            }
          >
            Envoyés
            <span>
              {statistiques.envoye}
            </span>
          </button>

          <button
            type="button"
            className={
              filtre ===
              "accepte"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "accepte"
              )
            }
          >
            Acceptés
            <span>
              {statistiques.accepte}
            </span>
          </button>

          <button
            type="button"
            className={
              filtre ===
              "facture"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "facture"
              )
            }
          >
            Facturés
            <span>
              {statistiques.facture}
            </span>
          </button>
        </div>

        {chargement ? (
          <div className="liste-devis-mobile-loading">
            <div className="liste-devis-mobile-spinner" />

            <strong>
              Chargement des devis…
            </strong>
          </div>
        ) : devisFiltres.length ===
          0 ? (
          <section className="liste-devis-mobile-empty">
            <span>
              🧾
            </span>

            <h3>
              Aucun devis
            </h3>

            <p>
              Aucun document ne correspond à cette recherche.
            </p>

            {onNouveauDevis ? (
              <button
                type="button"
                onClick={
                  onNouveauDevis
                }
              >
                Créer un devis
              </button>
            ) : null}
          </section>
        ) : (
          <div className="liste-devis-mobile-list">
            {devisFiltres.map(
              (
                item
              ) => {
                const statut =
                  normaliser(
                    item.statut
                  );

                const accepte =
                  statut ===
                  "accepte";

                const facture =
                  statut ===
                  "facture";

                const formulaireEmailOuvert =
                  devisEmailId ===
                  item.id;

                return (
                  <article
                    key={
                      item.id
                    }
                    className="liste-devis-mobile-card"
                  >
                    <div className="liste-devis-mobile-card-head">
                      <div>
                        <small>
                          {item.numero ||
                            "NUMÉRO EN COURS"}
                        </small>

                        <h3>
                          {nomClient(
                            item
                          )}
                        </h3>
                      </div>

                      <span
                        className={`liste-devis-mobile-status ${classeStatut(
                          item.statut
                        )}`}
                      >
                        {libelleStatut(
                          item.statut
                        )}
                      </span>
                    </div>

                    {item.objet ? (
                      <p className="liste-devis-mobile-object">
                        {item.objet}
                      </p>
                    ) : null}

                    <div className="liste-devis-mobile-meta">
                      <span>
                        <small>
                          DATE
                        </small>

                        <strong>
                          {formatDate(
                            item.date_devis
                          )}
                        </strong>
                      </span>

                      <span>
                        <small>
                          TOTAL TTC
                        </small>

                        <strong>
                          {formatMontant(
                            item.total_ttc
                          )}
                        </strong>
                      </span>
                    </div>

                    {accepte ? (
                      <section className="liste-devis-mobile-invoice-box">
                        <div>
                          <span>
                            ✓
                          </span>

                          <div>
                            <small>
                              DEVIS ACCEPTÉ
                            </small>

                            <strong>
                              Prêt à facturer
                            </strong>

                            <p>
                              Les lignes, prix, TVA et client seront repris automatiquement.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={
                            action !==
                            null
                          }
                          onClick={() =>
                            void transformerEnFacture(
                              item
                            )
                          }
                        >
                          {actionEnCours(
                            "facture",
                            item.id
                          )
                            ? "Création de la facture…"
                            : "Créer la facture"}
                        </button>
                      </section>
                    ) : null}

                    {facture ? (
                      <section className="liste-devis-mobile-invoiced-box">
                        <span>
                          ✓
                        </span>

                        <div>
                          <small>
                            FACTURÉ
                          </small>

                          <strong>
                            Ce devis a déjà été transformé en facture.
                          </strong>
                        </div>

                        {onOuvrirFactures ? (
                          <button
                            type="button"
                            onClick={
                              onOuvrirFactures
                            }
                          >
                            Voir les factures
                          </button>
                        ) : null}
                      </section>
                    ) : null}

                    <div className="liste-devis-mobile-actions">
                      <button
                        type="button"
                        disabled={
                          action !==
                          null
                        }
                        onClick={() =>
                          void voirPdf(
                            item
                          )
                        }
                      >
                        <span>
                          📄
                        </span>

                        <strong>
                          {actionEnCours(
                            "pdf",
                            item.id
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
                          formulaireEmailOuvert
                            ? fermerEnvoiEmail()
                            : ouvrirEnvoiEmail(
                                item
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

                    {formulaireEmailOuvert ? (
                      <section className="liste-devis-mobile-email">
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
                              fermerEnvoiEmail
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
                                item
                              )
                            }
                          >
                            {actionEnCours(
                              "email",
                              item.id
                            )
                              ? "Envoi…"
                              : "Envoyer le devis"}
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
          className="liste-devis-mobile-bottom-refresh"
          disabled={
            chargement
          }
          onClick={() =>
            void chargerDevis()
          }
        >
          ↻ Actualiser les devis
        </button>
      </section>
    </main>
  );
}