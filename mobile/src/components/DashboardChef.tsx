import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import ClientsMobile from "./ClientsMobile";
import DevisMobile from "./DevisMobile";
import ListeDevisMobile from "./ListeDevisMobile";
import ListeFacturesMobile from "./ListeFacturesMobile";
import PlanningChefMobile from "./PlanningChefMobile";
import InterventionsChefMobile from "./InterventionsChefMobile";
import SalariesMobile from "./SalariesMobile";
import DemandesChefMobile from "./DemandesChefMobile";
import ProfilChefMobile from "./ProfilChefMobile";
import PlusChefMobile from "./PlusChefMobile";

import "./DashboardChef.css";

type Props = {
  entrepriseId: string;

  prenom?:
    string | null;

  onDeconnexion:
    () => void;
};

type VueChef =
  | "accueil"
  | "clients"
  | "devis"
  | "nouveau-devis"
  | "factures"
  | "planning"
  | "interventions"
  | "salaries"
  | "demandes"
  | "profil"
  | "plus";

type Stats = {
  clients:
    number;

  devis:
    number;

  devisAcceptes:
    number;

  factures:
    number;

  facturesEnAttente:
    number;

  interventions:
    number;

  interventionsAujourdhui:
    number;

  salaries:
    number;

  salariesActifs:
    number;

  demandesATraiter:
    number;

  totalFacture:
    number;

  totalPaye:
    number;

  resteAPayer:
    number;
};

type InterventionJour = {
  id: string;

  numero:
    string | null;

  client_nom:
    string | null;

  type_intervention:
    string | null;

  date_prevue:
    string | null;

  date_intervention:
    string | null;

  heure_debut_prevue:
    string | null;

  heure_debut:
    string | null;

  ville_chantier:
    string | null;

  statut:
    string | null;
};

type SalarieResume = {
  id: string;

  statut:
    string | null;
};

type DemandeResume = {
  id: string;

  decision_chef:
    string | null;

  archivee:
    boolean | null;
};

const STATS_VIDES:
  Stats = {
  clients:
    0,

  devis:
    0,

  devisAcceptes:
    0,

  factures:
    0,

  facturesEnAttente:
    0,

  interventions:
    0,

  interventionsAujourdhui:
    0,

  salaries:
    0,

  salariesActifs:
    0,

  demandesATraiter:
    0,

  totalFacture:
    0,

  totalPaye:
    0,

  resteAPayer:
    0,
};

function dateLocaleIso() {
  const maintenant =
    new Date();

  const annee =
    maintenant.getFullYear();

  const mois =
    String(
      maintenant.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const jour =
    String(
      maintenant.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${annee}-${mois}-${jour}`;
}

function dateLongue() {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      weekday:
        "long",

      day:
        "numeric",

      month:
        "long",
    }
  ).format(
    new Date()
  );
}

function capitale(
  texte:
    string
) {
  if (
    !texte
  ) {
    return "";
  }

  return (
    texte
      .charAt(
        0
      )
      .toUpperCase() +
    texte.slice(
      1
    )
  );
}

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
  montant:
    unknown
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style:
        "currency",

      currency:
        "EUR",

      maximumFractionDigits:
        0,
    }
  ).format(
    nombre(
      montant
    )
  );
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

function estSalarieActif(
  salarie:
    SalarieResume
) {
  const statut =
    normaliser(
      salarie.statut
    );

  return (
    !statut ||
    statut ===
      "actif"
  );
}

function heureIntervention(
  intervention:
    InterventionJour
) {
  const heure =
    intervention
      .heure_debut_prevue ||
    intervention
      .heure_debut ||
    "";

  if (
    !heure
  ) {
    return "—";
  }

  return heure.slice(
    0,
    5
  );
}

export default function DashboardChef({
  entrepriseId,
  prenom,
  onDeconnexion,
}: Props) {
  const [
    vue,
    setVue,
  ] =
    useState<VueChef>(
      "accueil"
    );

  const [
    stats,
    setStats,
  ] =
    useState<Stats>(
      STATS_VIDES
    );

  const [
    interventionsJour,
    setInterventionsJour,
  ] =
    useState<
      InterventionJour[]
    >([]);

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
    ficheInterventionInitiale,
    setFicheInterventionInitiale,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    menuCreationOuvert,
    setMenuCreationOuvert,
  ] =
    useState(
      false
    );

  const nomAffiche =
    useMemo(
      () =>
        prenom
          ?.trim() ||
        "Chef",
      [
        prenom,
      ]
    );

  useEffect(() => {
    void chargerDashboard();
  }, [
    entrepriseId,
  ]);

  async function chargerDashboard() {
    if (
      !entrepriseId
    ) {
      return;
    }

    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      const aujourdHui =
        dateLocaleIso();

      const [
        clientsResult,
        devisResult,
        facturesResult,
        interventionsResult,
        salariesResult,
        demandesResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "clients"
            )
            .select(
              "id",
              {
                count:
                  "exact",

                head:
                  true,
              }
            )
            .eq(
              "entreprise_id",
              entrepriseId
            ),

          supabase
            .from(
              "devis"
            )
            .select(
              `
                id,
                statut
              `
            )
            .eq(
              "entreprise_id",
              entrepriseId
            ),

          supabase
            .from(
              "factures"
            )
            .select(
              `
                id,
                statut,
                type_facture,
                est_avoir,
                total_ttc,
                montant_paye,
                reste_a_payer
              `
            )
            .eq(
              "entreprise_id",
              entrepriseId
            ),

          supabase
            .from(
              "fiches_intervention"
            )
            .select(
              `
                id,
                numero,
                client_nom,
                type_intervention,
                date_prevue,
                date_intervention,
                heure_debut_prevue,
                heure_debut,
                ville_chantier,
                statut
              `
            )
            .eq(
              "entreprise_id",
              entrepriseId
            ),

          supabase
            .from(
              "salaries"
            )
            .select(
              `
                id,
                statut
              `
            )
            .eq(
              "entreprise_id",
              entrepriseId
            ),

          supabase
            .from(
              "demandes"
            )
            .select(
              `
                id,
                decision_chef,
                archivee
              `
            )
            .eq(
              "entreprise_id",
              entrepriseId
            ),
        ]);

      if (
        clientsResult.error
      ) {
        throw clientsResult.error;
      }

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

      if (
        interventionsResult.error
      ) {
        throw interventionsResult.error;
      }

      if (
        salariesResult.error
      ) {
        throw salariesResult.error;
      }

      if (
        demandesResult.error
      ) {
        throw demandesResult.error;
      }

      const devis =
        devisResult.data ||
        [];

      const factures =
        facturesResult.data ||
        [];

      const interventions =
        (
          interventionsResult.data ||
          []
        ) as InterventionJour[];

      const salaries =
        (
          salariesResult.data ||
          []
        ) as SalarieResume[];

      const demandes =
        (
          demandesResult.data ||
          []
        ) as DemandeResume[];

      const facturesNormales =
        factures.filter(
          (
            facture
          ) =>
            !Boolean(
              facture.est_avoir
            ) &&
            normaliser(
              facture.type_facture
            ) !==
              "avoir"
        );

      const totalFacture =
        facturesNormales.reduce(
          (
            somme,
            facture
          ) =>
            somme +
            nombre(
              facture.total_ttc
            ),
          0
        );

      const totalPaye =
        facturesNormales.reduce(
          (
            somme,
            facture
          ) =>
            somme +
            nombre(
              facture.montant_paye
            ),
          0
        );

      const resteAPayer =
        facturesNormales.reduce(
          (
            somme,
            facture
          ) =>
            somme +
            nombre(
              facture.reste_a_payer
            ),
          0
        );

      const facturesEnAttente =
        facturesNormales.filter(
          (
            facture
          ) => {
            const statut =
              normaliser(
                facture.statut
              );

            return (
              nombre(
                facture.reste_a_payer
              ) >
                0 &&
              ![
                "payee",
                "paye",
                "annulee",
                "archive",
              ].includes(
                statut
              )
            );
          }
        ).length;

      const devisAcceptes =
        devis.filter(
          (
            devisItem
          ) =>
            normaliser(
              devisItem.statut
            ) ===
            "accepte"
        ).length;

      const duJour =
        interventions
          .filter(
            (
              intervention
            ) => {
              const date =
                intervention
                  .date_prevue ||
                intervention
                  .date_intervention;

              const statut =
                normaliser(
                  intervention.statut
                );

              return (
                date ===
                  aujourdHui &&
                ![
                  "archive",
                  "archivee",
                  "annule",
                  "annulee",
                ].includes(
                  statut
                )
              );
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              heureIntervention(
                a
              ).localeCompare(
                heureIntervention(
                  b
                )
              )
          );

      const salariesActifs =
        salaries.filter(
          estSalarieActif
        ).length;

      const demandesATraiter =
        demandes.filter(
          (
            demande
          ) =>
            !demande.decision_chef &&
            !demande.archivee
        ).length;

      setStats({
        clients:
          clientsResult.count ||
          0,

        devis:
          devis.length,

        devisAcceptes,

        factures:
          facturesNormales.length,

        facturesEnAttente,

        interventions:
          interventions.length,

        interventionsAujourdhui:
          duJour.length,

        salaries:
          salaries.length,

        salariesActifs,

        demandesATraiter,

        totalFacture,

        totalPaye,

        resteAPayer,
      });

      setInterventionsJour(
        duJour
      );
    } catch (
      error
    ) {
      console.error(
        "Chargement dashboard chef mobile :",
        error
      );

      setErreur(
        "Impossible de charger certains indicateurs du dashboard."
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  function retourAccueil() {
    setVue(
      "accueil"
    );

    setMenuCreationOuvert(
      false
    );

    setFicheInterventionInitiale(
      null
    );

    void chargerDashboard();
  }

  function ouvrirClients() {
    setMenuCreationOuvert(
      false
    );

    setVue(
      "clients"
    );
  }

  function ouvrirDevis() {
    setMenuCreationOuvert(
      false
    );

    setVue(
      "devis"
    );
  }

  function ouvrirNouveauDevis() {
    setMenuCreationOuvert(
      false
    );

    setVue(
      "nouveau-devis"
    );
  }

  function ouvrirFactures() {
    setMenuCreationOuvert(
      false
    );

    setVue(
      "factures"
    );
  }

  function ouvrirPlanning() {
    setMenuCreationOuvert(
      false
    );

    setVue(
      "planning"
    );
  }

  function ouvrirInterventions() {
    setMenuCreationOuvert(
      false
    );

    setFicheInterventionInitiale(
      null
    );

    setVue(
      "interventions"
    );
  }

  function ouvrirSalaries() {
    setMenuCreationOuvert(
      false
    );

    setVue(
      "salaries"
    );
  }

  function ouvrirDemandes() {
    setMenuCreationOuvert(
      false
    );

    setVue(
      "demandes"
    );
  }

  function ouvrirProfil() {
    setMenuCreationOuvert(
      false
    );

    setVue(
      "profil"
    );
  }

  function ouvrirPlus() {
    setMenuCreationOuvert(
      false
    );

    setVue(
      "plus"
    );
  }

  function ouvrirFicheIntervention(
    ficheId:
      string
  ) {
    setMenuCreationOuvert(
      false
    );

    setFicheInterventionInitiale(
      ficheId
    );

    setVue(
      "interventions"
    );
  }

  if (
    vue ===
    "clients"
  ) {
    return (
      <ClientsMobile
        entrepriseId={
          entrepriseId
        }
        onFermer={
          retourAccueil
        }
      />
    );
  }

  if (
    vue ===
    "nouveau-devis"
  ) {
    return (
      <DevisMobile
        entrepriseId={
          entrepriseId
        }
        onFermer={() => {
          setVue(
            "devis"
          );

          void chargerDashboard();
        }}
        onDevisCree={() => {
          void chargerDashboard();
        }}
      />
    );
  }

  if (
    vue ===
    "devis"
  ) {
    return (
      <ListeDevisMobile
        entrepriseId={
          entrepriseId
        }
        onFermer={
          retourAccueil
        }
        onNouveauDevis={
          ouvrirNouveauDevis
        }
        onFactureCree={() => {
          void chargerDashboard();
        }}
        onOuvrirFactures={
          ouvrirFactures
        }
      />
    );
  }

  if (
    vue ===
    "factures"
  ) {
    return (
      <ListeFacturesMobile
        entrepriseId={
          entrepriseId
        }
        onFermer={
          retourAccueil
        }
        onActualiser={() => {
          void chargerDashboard();
        }}
      />
    );
  }

  if (
    vue ===
    "planning"
  ) {
    return (
      <PlanningChefMobile
        entrepriseId={
          entrepriseId
        }
        onFermer={
          retourAccueil
        }
        onOuvrirIntervention={
          ouvrirFicheIntervention
        }
      />
    );
  }

  if (
    vue ===
    "interventions"
  ) {
    return (
      <InterventionsChefMobile
        entrepriseId={
          entrepriseId
        }
        ficheIdInitiale={
          ficheInterventionInitiale
        }
        onFermer={
          retourAccueil
        }
        onFicheCree={() => {
          void chargerDashboard();
        }}
      />
    );
  }

  if (
    vue ===
    "salaries"
  ) {
    return (
      <SalariesMobile
        entrepriseId={
          entrepriseId
        }
        onFermer={
          retourAccueil
        }
        onModification={() => {
          void chargerDashboard();
        }}
      />
    );
  }

  if (
    vue ===
    "demandes"
  ) {
    return (
      <DemandesChefMobile
        entrepriseId={
          entrepriseId
        }
        onFermer={
          retourAccueil
        }
        onModification={() => {
          void chargerDashboard();
        }}
      />
    );
  }

  if (
    vue ===
    "profil"
  ) {
    return (
      <ProfilChefMobile
        entrepriseId={
          entrepriseId
        }
        onFermer={
          ouvrirPlus
        }
        onDeconnexion={
          onDeconnexion
        }
        onModification={() => {
          void chargerDashboard();
        }}
      />
    );
  }

  if (
    vue ===
    "plus"
  ) {
    return (
      <PlusChefMobile
        prenom={
          prenom
        }
        onFermer={
          retourAccueil
        }
        onProfil={
          ouvrirProfil
        }
        onSalaries={
          ouvrirSalaries
        }
        onDemandes={
          ouvrirDemandes
        }
        onDeconnexion={
          onDeconnexion
        }
        nombreSalariesActifs={
          stats.salariesActifs
        }
        nombreDemandes={
          stats.demandesATraiter
        }
      />
    );
  }

  return (
    <main className="chef-dashboard">
      <header className="chef-topbar">
        <div>
          <div className="chef-brand">
            <span className="chef-brand-mark">
              A
            </span>

            <span>
              ARBOBOARD
            </span>
          </div>

          <p className="chef-kicker">
            ESPACE CHEF
          </p>

          <h1>
            Bonjour{" "}
            {nomAffiche} 👋
          </h1>

          <p className="chef-subtitle">
            {capitale(
              dateLongue()
            )}
          </p>
        </div>

        <button
          type="button"
          className="chef-avatar"
          onClick={
            ouvrirProfil
          }
          aria-label="Ouvrir mon profil"
          title="Mon profil"
        >
          👤
        </button>
      </header>

      {erreur ? (
        <div
          className="chef-alert"
          role="alert"
        >
          {erreur}

          <button
            type="button"
            onClick={() =>
              void chargerDashboard()
            }
          >
            Réessayer
          </button>
        </div>
      ) : null}

      <section className="chef-hero-card">
        <div>
          <p className="chef-kicker chef-kicker-light">
            AUJOURD’HUI
          </p>

          <h2>
            {chargement
              ? "Chargement…"
              : stats.interventionsAujourdhui ===
                  0
                ? "Aucune intervention aujourd’hui"
                : stats.interventionsAujourdhui ===
                    1
                  ? "1 intervention aujourd’hui"
                  : `${stats.interventionsAujourdhui} interventions aujourd’hui`}
          </h2>

          <p>
            {stats.demandesATraiter >
            0
              ? `${stats.demandesATraiter} demande${
                  stats.demandesATraiter >
                  1
                    ? "s"
                    : ""
                } salarié${
                  stats.demandesATraiter >
                  1
                    ? "s"
                    : ""
                } à traiter.`
              : stats.devisAcceptes >
                  0
                ? `${stats.devisAcceptes} devis accepté${
                    stats.devisAcceptes >
                    1
                      ? "s"
                      : ""
                  } prêt${
                    stats.devisAcceptes >
                    1
                      ? "s"
                      : ""
                  } à facturer.`
                : "Votre activité Arboboard est à jour."}
          </p>
        </div>

        <button
          type="button"
          className="chef-refresh"
          onClick={() =>
            void chargerDashboard()
          }
          disabled={
            chargement
          }
        >
          {chargement
            ? "Chargement…"
            : "Actualiser"}
        </button>
      </section>

      <section className="chef-section">
        <div className="chef-section-heading">
          <div>
            <p className="chef-kicker">
              ACTIONS RAPIDES
            </p>

            <h2>
              Que voulez-vous faire ?
            </h2>
          </div>
        </div>

        <div className="chef-grid">
          <button
            type="button"
            className="chef-action-card"
            onClick={
              ouvrirNouveauDevis
            }
          >
            <span className="chef-action-icon">
              ＋
            </span>

            <span className="chef-action-content">
              <span className="chef-action-title">
                Nouveau devis
              </span>

              <span className="chef-action-subtitle">
                Client → prestations → récap
              </span>
            </span>

            <span className="chef-action-value">
              →
            </span>
          </button>

          <button
            type="button"
            className="chef-action-card"
            onClick={
              ouvrirClients
            }
          >
            <span className="chef-action-icon">
              👤
            </span>

            <span className="chef-action-content">
              <span className="chef-action-title">
                Clients
              </span>

              <span className="chef-action-subtitle">
                Fiches et coordonnées
              </span>
            </span>

            <span className="chef-action-value">
              {chargement
                ? "…"
                : stats.clients}
            </span>
          </button>

          <button
            type="button"
            className="chef-action-card"
            onClick={
              ouvrirInterventions
            }
          >
            <span className="chef-action-icon">
              🌳
            </span>

            <span className="chef-action-content">
              <span className="chef-action-title">
                Interventions
              </span>

              <span className="chef-action-subtitle">
                Préparer les chantiers
              </span>
            </span>

            <span className="chef-action-value">
              {chargement
                ? "…"
                : stats.interventions}
            </span>
          </button>

          <button
            type="button"
            className="chef-action-card"
            onClick={
              ouvrirSalaries
            }
          >
            <span className="chef-action-icon">
              🦺
            </span>

            <span className="chef-action-content">
              <span className="chef-action-title">
                Équipe
              </span>

              <span className="chef-action-subtitle">
                Salariés et accès
              </span>
            </span>

            <span className="chef-action-value">
              {chargement
                ? "…"
                : stats.salariesActifs}
            </span>
          </button>

          <button
            type="button"
            className="chef-action-card"
            onClick={
              ouvrirDemandes
            }
          >
            <span className="chef-action-icon">
              📩
            </span>

            <span className="chef-action-content">
              <span className="chef-action-title">
                Demandes
              </span>

              <span className="chef-action-subtitle">
                Congés, RDV et absences
              </span>
            </span>

            <span className="chef-action-value">
              {chargement
                ? "…"
                : stats.demandesATraiter}
            </span>
          </button>
        </div>
      </section>

      <section className="chef-section">
        <div className="chef-section-heading">
          <div>
            <p className="chef-kicker">
              DOCUMENTS
            </p>

            <h2>
              Devis & factures
            </h2>
          </div>
        </div>

        <div className="chef-grid">
          <button
            type="button"
            className="chef-action-card"
            onClick={
              ouvrirDevis
            }
          >
            <span className="chef-action-icon">
              🧾
            </span>

            <span className="chef-action-content">
              <span className="chef-action-title">
                Devis
              </span>

              <span className="chef-action-subtitle">
                Créer, envoyer et facturer
              </span>
            </span>

            <span className="chef-action-value">
              {chargement
                ? "…"
                : stats.devis}
            </span>
          </button>

          <button
            type="button"
            className="chef-action-card"
            onClick={
              ouvrirFactures
            }
          >
            <span className="chef-action-icon">
              €
            </span>

            <span className="chef-action-content">
              <span className="chef-action-title">
                Factures
              </span>

              <span className="chef-action-subtitle">
                Consulter et envoyer
              </span>
            </span>

            <span className="chef-action-value">
              {chargement
                ? "…"
                : stats.factures}
            </span>
          </button>
        </div>
      </section>

      <section className="chef-bottom-card">
        <div>
          <p className="chef-kicker">
            FACTURATION
          </p>

          <h3>
            {formatMontant(
              stats.resteAPayer
            )}{" "}
            restant à payer
          </h3>

          <p>
            {formatMontant(
              stats.totalPaye
            )}{" "}
            encaissé sur{" "}
            {formatMontant(
              stats.totalFacture
            )}{" "}
            facturé.
          </p>

          <p>
            {stats.facturesEnAttente}{" "}
            facture
            {stats.facturesEnAttente >
            1
              ? "s"
              : ""}{" "}
            avec un solde restant.
          </p>

          <button
            type="button"
            onClick={
              ouvrirFactures
            }
          >
            Voir les factures
          </button>
        </div>
      </section>

      {stats.demandesATraiter >
      0 ? (
        <section className="chef-bottom-card">
          <div>
            <p className="chef-kicker">
              DEMANDES
            </p>

            <h3>
              {stats.demandesATraiter} demande
              {stats.demandesATraiter >
              1
                ? "s"
                : ""}{" "}
              à traiter
            </h3>

            <p>
              Votre équipe attend votre décision.
            </p>

            <button
              type="button"
              onClick={
                ouvrirDemandes
              }
            >
              Voir les demandes
            </button>
          </div>
        </section>
      ) : null}

      <section className="chef-section">
        <div className="chef-section-heading">
          <div>
            <p className="chef-kicker">
              AUJOURD’HUI
            </p>

            <h2>
              Chantiers du jour
            </h2>
          </div>

          <button
            type="button"
            onClick={
              ouvrirPlanning
            }
          >
            Planning
          </button>
        </div>

        {chargement ? (
          <section className="chef-bottom-card">
            <p>
              Chargement du planning…
            </p>
          </section>
        ) : interventionsJour.length ===
          0 ? (
          <section className="chef-bottom-card">
            <div>
              <h3>
                Aucun chantier prévu aujourd’hui
              </h3>

              <p>
                Consultez le planning pour voir les prochaines interventions.
              </p>
            </div>
          </section>
        ) : (
          <div className="chef-grid">
            {interventionsJour.map(
              (
                intervention
              ) => (
                <button
                  type="button"
                  className="chef-action-card"
                  key={
                    intervention.id
                  }
                  onClick={() =>
                    ouvrirFicheIntervention(
                      intervention.id
                    )
                  }
                >
                  <span className="chef-action-icon">
                    {heureIntervention(
                      intervention
                    )}
                  </span>

                  <span className="chef-action-content">
                    <span className="chef-action-title">
                      {intervention.type_intervention ||
                        intervention.numero ||
                        "Intervention"}
                    </span>

                    <span className="chef-action-subtitle">
                      {intervention.client_nom ||
                        "Client non renseigné"}

                      {intervention.ville_chantier
                        ? ` • ${intervention.ville_chantier}`
                        : ""}
                    </span>
                  </span>

                  <span className="chef-action-value">
                    →
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </section>

      <section className="chef-bottom-card">
        <div>
          <p className="chef-kicker">
            ÉQUIPE
          </p>

          <h3>
            {stats.salariesActifs} salarié
            {stats.salariesActifs >
            1
              ? "s"
              : ""}{" "}
            actif
            {stats.salariesActifs >
            1
              ? "s"
              : ""}
          </h3>

          <p>
            {stats.salaries} fiche
            {stats.salaries >
            1
              ? "s"
              : ""}{" "}
            salarié enregistrée
            {stats.salaries >
            1
              ? "s"
              : ""} dans Arboboard.
          </p>

          <button
            type="button"
            onClick={
              ouvrirSalaries
            }
          >
            Gérer l’équipe
          </button>
        </div>
      </section>

      {menuCreationOuvert ? (
        <div className="chef-quick-menu">
          <button
            type="button"
            onClick={
              ouvrirNouveauDevis
            }
          >
            <span>
              🧾
            </span>

            Nouveau devis
          </button>

          <button
            type="button"
            onClick={
              ouvrirClients
            }
          >
            <span>
              👤
            </span>

            Clients
          </button>

          <button
            type="button"
            onClick={
              ouvrirInterventions
            }
          >
            <span>
              🌳
            </span>

            Interventions
          </button>

          <button
            type="button"
            onClick={
              ouvrirSalaries
            }
          >
            <span>
              🦺
            </span>

            Équipe / salariés
          </button>

          <button
            type="button"
            onClick={
              ouvrirDemandes
            }
          >
            <span>
              📩
            </span>

            Demandes salariés
          </button>

          <button
            type="button"
            onClick={
              ouvrirFactures
            }
          >
            <span>
              €
            </span>

            Factures
          </button>
        </div>
      ) : null}

      <nav
        className="chef-bottom-nav"
        aria-label="Navigation principale"
      >
        <button
          type="button"
          className="active"
          onClick={
            retourAccueil
          }
        >
          <span>
            ⌂
          </span>

          Accueil
        </button>

        <button
          type="button"
          onClick={
            ouvrirPlanning
          }
        >
          <span>
            ▦
          </span>

          Planning
        </button>

        <button
          type="button"
          className="chef-bottom-nav-main"
          onClick={() =>
            setMenuCreationOuvert(
              (
                ouvert
              ) =>
                !ouvert
            )
          }
          aria-label="Créer ou ouvrir le menu"
        >
          <span>
            +
          </span>
        </button>

        <button
          type="button"
          onClick={
            ouvrirDevis
          }
        >
          <span>
            🧾
          </span>

          Documents
        </button>

        <button
          type="button"
          onClick={
            ouvrirPlus
          }
        >
          <span>
            •••
          </span>

          Plus
        </button>
      </nav>
    </main>
  );
}