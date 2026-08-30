import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ComponentType,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import {
  estEnLigne,
  lireCache,
  mettreEnCache,
} from "../lib/offline";

import InterventionSalarieMobile from "./InterventionSalarieOfflineBridge";
import DemandesSalarieMobile from "./DemandesSalarieMobile";
import ProfilSalarieMobile from "./ProfilSalarieMobile";
import PvFinChantierMobile from "./PvFinChantierMobile";

import "./DashboardSalarie.css";

type Props = {
  profilId: string;
  entrepriseId:
    string | null;
  prenom?:
    string | null;
  email?:
    string | null;
  onDeconnexion:
    () => void;
};

type VueSalarie =
  | "accueil"
  | "planning"
  | "chantiers"
  | "intervention"
  | "demandes"
  | "profil"
  | "pv";

type SalarieRow = {
  id: string;
  user_id?:
    string | null;
  profil_id?:
    string | null;
  email?:
    string | null;
  prenom?:
    string | null;
  nom?:
    string | null;
  entreprise_id?:
    string | null;
};

type FicheIntervention = {
  id: string;

  numero:
    string | null;
  titre:
    string | null;

  type_intervention:
    string | null;

  client_nom:
    string | null;

  adresse_chantier:
    string | null;

  code_postal_chantier:
    string | null;

  ville_chantier:
    string | null;

  date_debut_prevue:
    string | null;

  date_fin_prevue:
    string | null;

  date_prevue:
    string | null;

  date_intervention:
    string | null;

  heure_debut_prevue:
    string | null;

  heure_debut:
    string | null;

  statut:
    string | null;

  salarie_id?:
    string | null;

  pv_fin_chantier_id?:
    string | null;

  etape_materiel_statut?:
    string | null;

  etape_arrivee_statut?:
    string | null;

  etape_fin_statut?:
    string | null;
};

type CacheDashboardSalarie = {
  salarie:
    SalarieRow;
  entrepriseId:
    string;
  fiches:
    FicheIntervention[];
  enregistreLe:
    string;
};

const InterventionMobile =
  InterventionSalarieMobile as ComponentType<
    Record<
      string,
      unknown
    >
  >;

const DemandesMobile =
  DemandesSalarieMobile as ComponentType<
    Record<
      string,
      unknown
    >
  >;

const ProfilMobile =
  ProfilSalarieMobile as ComponentType<
    Record<
      string,
      unknown
    >
  >;

function normaliser(
  valeur:
    string | null | undefined
) {
  return String(
    valeur || ""
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

function aujourdHuiIso() {
  const date =
    new Date();

  const annee =
    date.getFullYear();

  const mois =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const jour =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${annee}-${mois}-${jour}`;
}

function dateDebut(
  fiche:
    FicheIntervention
) {
  return (
    fiche.date_debut_prevue ||
    fiche.date_prevue ||
    fiche.date_intervention ||
    null
  );
}

function dateFin(
  fiche:
    FicheIntervention
) {
  return (
    fiche.date_fin_prevue ||
    dateDebut(
      fiche
    )
  );
}

function formatDate(
  date:
    string | null
) {
  if (
    !date
  ) {
    return "Non planifiée";
  }

  try {
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
      new Date(
        `${date.slice(
          0,
          10
        )}T12:00:00`
      )
    );
  } catch {
    return date;
  }
}

function texteStatut(
  statut:
    string | null | undefined
) {
  const valeur =
    normaliser(
      statut
    );

  if (
    valeur.includes(
      "term"
    )
  ) {
    return "Terminée";
  }

  if (
    valeur.includes(
      "cours"
    )
  ) {
    return "En cours";
  }

  if (
    valeur.includes(
      "plan"
    )
  ) {
    return "Planifiée";
  }

  if (
    valeur.includes(
      "brou"
    )
  ) {
    return "Brouillon";
  }

  return (
    statut ||
    "Planifiée"
  );
}

function nomIntervention(
  fiche:
    FicheIntervention
) {
  return (
    fiche.titre ||
    fiche.type_intervention ||
    fiche.numero ||
    "Intervention"
  );
}

function adresseIntervention(
  fiche:
    FicheIntervention
) {
  return (
    [
      fiche.adresse_chantier,
      fiche.code_postal_chantier,
      fiche.ville_chantier,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      ) ||
    "Adresse à consulter dans la fiche"
  );
}

function heureIntervention(
  fiche:
    FicheIntervention
) {
  const heure =
    fiche.heure_debut_prevue ||
    fiche.heure_debut;

  return heure
    ? heure.slice(
        0,
        5
      )
    : "—";
}

function interventionTerminee(
  fiche:
    FicheIntervention
) {
  return normaliser(
    fiche.statut
  ).includes(
    "term"
  );
}

function cleCacheDashboard(
  profilId:
    string
) {
  return `salarie:dashboard:${profilId}`;
}

export default function DashboardSalarie({
  profilId,
  entrepriseId,
  prenom,
  email,
  onDeconnexion,
}: Props) {
  const [
    vue,
    setVue,
  ] =
    useState<VueSalarie>(
      "accueil"
    );

  const [
    salarie,
    setSalarie,
  ] =
    useState<SalarieRow | null>(
      null
    );

  const [
    entrepriseCouranteId,
    setEntrepriseCouranteId,
  ] =
    useState(
      entrepriseId ||
        ""
    );

  const [
    fiches,
    setFiches,
  ] =
    useState<
      FicheIntervention[]
    >([]);

  const [
    ficheSelectionneeId,
    setFicheSelectionneeId,
  ] =
    useState<
      string | null
    >(
      null
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
    donneesHorsLigne,
    setDonneesHorsLigne,
  ] =
    useState(
      false
    );

  const prenomAffiche =
    useMemo(
      () =>
        prenom
          ?.trim() ||
        salarie?.prenom
          ?.trim() ||
        "Bonjour",
      [
        prenom,
        salarie,
      ]
    );

  const ficheDuJour =
    useMemo(
      () => {
        const jour =
          aujourdHuiIso();

        return (
          fiches.find(
            (
              fiche
            ) => {
              const debut =
                dateDebut(
                  fiche
                );

              const fin =
                dateFin(
                  fiche
                );

              if (
                !debut
              ) {
                return false;
              }

              return (
                jour >=
                  debut &&
                jour <=
                  (
                    fin ||
                    debut
                  )
              );
            }
          ) ||
          fiches.find(
            (
              fiche
            ) =>
              normaliser(
                fiche.statut
              ).includes(
                "cours"
              )
          ) ||
          null
        );
      },
      [
        fiches,
      ]
    );

  const fichesPlanning =
    useMemo(
      () =>
        [
          ...fiches,
        ].sort(
          (
            a,
            b
          ) =>
            String(
              dateDebut(
                a
              ) ||
                "9999-12-31"
            ).localeCompare(
              String(
                dateDebut(
                  b
                ) ||
                  "9999-12-31"
              )
            )
        ),
      [
        fiches,
      ]
    );

  useEffect(() => {
    void chargerDashboard();
  }, [
    profilId,
    entrepriseId,
    email,
  ]);

  async function trouverSalarie() {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "salaries"
        )
        .select(
          `
            id,
            user_id,
            profil_id,
            email,
            prenom,
            nom,
            entreprise_id
          `
        )
        .limit(
          100
        );

    if (
      error
    ) {
      throw error;
    }

    const lignes =
      (
        data ||
        []
      ) as SalarieRow[];

    const emailNormalise =
      String(
        email ||
          ""
      )
        .trim()
        .toLowerCase();

    return (
      lignes.find(
        (
          ligne
        ) =>
          ligne.profil_id ===
            profilId ||
          ligne.user_id ===
            profilId ||
          (
            Boolean(
              emailNormalise
            ) &&
            String(
              ligne.email ||
                ""
            )
              .trim()
              .toLowerCase() ===
              emailNormalise
          )
      ) ||
      null
    );
  }

  async function chargerInterventions(
    idSalarie:
      string,
    idEntreprise:
      string
  ) {
    const [
      liaisonsResult,
      anciennesResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "fiches_intervention_salaries"
          )
          .select(
            "fiche_id"
          )
          .eq(
            "salarie_id",
            idSalarie
          ),

        supabase
          .from(
            "fiches_intervention"
          )
          .select(
            "*"
          )
          .eq(
            "entreprise_id",
            idEntreprise
          )
          .eq(
            "salarie_id",
            idSalarie
          ),
      ]);

    const ids =
      new Set<string>();

    if (
      !liaisonsResult.error
    ) {
      for (
        const liaison
        of liaisonsResult.data ||
        []
      ) {
        const id =
          String(
            liaison.fiche_id ||
              ""
          );

        if (
          id
        ) {
          ids.add(
            id
          );
        }
      }
    }

    if (
      anciennesResult.error
    ) {
      throw anciennesResult.error;
    }

    const fichesDirectes =
      (
        anciennesResult.data ||
        []
      ) as FicheIntervention[];

    for (
      const fiche
      of fichesDirectes
    ) {
      if (
        fiche.id
      ) {
        ids.add(
          fiche.id
        );
      }
    }

    let fichesLiees:
      FicheIntervention[] =
      [];

    if (
      ids.size >
      0
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "fiches_intervention"
          )
          .select(
            "*"
          )
          .eq(
            "entreprise_id",
            idEntreprise
          )
          .in(
            "id",
            Array.from(
              ids
            )
          );

      if (
        error
      ) {
        throw error;
      }

      fichesLiees =
        (
          data ||
          []
        ) as FicheIntervention[];
    }

    const parId =
      new Map<
        string,
        FicheIntervention
      >();

    for (
      const fiche
      of [
        ...fichesDirectes,
        ...fichesLiees,
      ]
    ) {
      parId.set(
        fiche.id,
        fiche
      );
    }

    return Array.from(
      parId.values()
    );
  }

  async function chargerDepuisCache() {
    const cache =
      await lireCache<CacheDashboardSalarie>(
        cleCacheDashboard(
          profilId
        )
      );

    if (
      !cache?.salarie ||
      !cache.entrepriseId
    ) {
      return false;
    }

    setSalarie(
      cache.salarie
    );

    setEntrepriseCouranteId(
      cache.entrepriseId
    );

    setFiches(
      Array.isArray(
        cache.fiches
      )
        ? cache.fiches
        : []
    );

    setDonneesHorsLigne(
      true
    );

    setErreur(
      ""
    );

    return true;
  }

  async function enregistrerCache(
    salarieTrouve:
      SalarieRow,
    idEntreprise:
      string,
    fichesChargees:
      FicheIntervention[]
  ) {
    await mettreEnCache<CacheDashboardSalarie>(
      cleCacheDashboard(
        profilId
      ),
      {
        salarie:
          salarieTrouve,
        entrepriseId:
          idEntreprise,
        fiches:
          fichesChargees,
        enregistreLe:
          new Date().toISOString(),
      }
    );
  }

  async function chargerDashboard() {
    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      if (
        !estEnLigne()
      ) {
        const charge =
          await chargerDepuisCache();

        if (
          !charge
        ) {
          throw new Error(
            "Aucune intervention n’est encore disponible hors ligne sur cet appareil. Ouvrez Arboboard une fois avec Internet."
          );
        }

        return;
      }

      try {
        const salarieTrouve =
          await trouverSalarie();

        if (
          !salarieTrouve
        ) {
          throw new Error(
            "Impossible de retrouver la fiche salarié liée à ce compte."
          );
        }

        const idEntreprise =
          String(
            salarieTrouve.entreprise_id ||
              entrepriseId ||
              ""
          );

        if (
          !idEntreprise
        ) {
          throw new Error(
            "Aucune entreprise n’est rattachée à ce compte."
          );
        }

        const fichesChargees =
          await chargerInterventions(
            salarieTrouve.id,
            idEntreprise
          );

        setSalarie(
          salarieTrouve
        );

        setEntrepriseCouranteId(
          idEntreprise
        );

        setFiches(
          fichesChargees
        );

        setDonneesHorsLigne(
          false
        );

        await enregistrerCache(
          salarieTrouve,
          idEntreprise,
          fichesChargees
        );
      } catch (
        erreurEnLigne
      ) {
        console.warn(
          "Chargement salarié en ligne impossible, tentative du cache :",
          erreurEnLigne
        );

        const charge =
          await chargerDepuisCache();

        if (
          !charge
        ) {
          throw erreurEnLigne;
        }
      }
    } catch (
      error
    ) {
      console.error(
        "Dashboard salarié mobile :",
        error
      );

      setErreur(
        error instanceof
          Error
          ? error.message
          : "Impossible de charger votre espace salarié."
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

    setFicheSelectionneeId(
      null
    );

    void chargerDashboard();
  }

  function ouvrirIntervention(
    ficheId:
      string
  ) {
    setFicheSelectionneeId(
      ficheId
    );

    setVue(
      "intervention"
    );
  }

  function ouvrirPv(
    ficheId:
      string
  ) {
    setFicheSelectionneeId(
      ficheId
    );

    setVue(
      "pv"
    );
  }

  function banniereHorsLigne() {
    if (
      !donneesHorsLigne
    ) {
      return null;
    }

    return (
      <section className="salarie-next-card">
        <p className="salarie-kicker">
          MODE HORS LIGNE
        </p>

        <h3>
          Données enregistrées sur cet appareil
        </h3>

        <p>
          Planning et liste des chantiers disponibles sans réseau. Les données seront actualisées au prochain chargement en ligne.
        </p>
      </section>
    );
  }

  if (
    vue ===
      "pv" &&
    ficheSelectionneeId &&
    entrepriseCouranteId
  ) {
    return (
      <PvFinChantierMobile
        entrepriseId={
          entrepriseCouranteId
        }
        ficheId={
          ficheSelectionneeId
        }
        salarieId={
          salarie?.id ||
          null
        }
        onFermer={() => {
          setVue(
            "accueil"
          );

          setFicheSelectionneeId(
            null
          );

          void chargerDashboard();
        }}
        onEnregistre={() => {
          void chargerDashboard();
        }}
      />
    );
  }

  if (
    vue ===
      "intervention" &&
    ficheSelectionneeId
  ) {
    return (
      <InterventionMobile
        entrepriseId={
          entrepriseCouranteId
        }
        salarieId={
          salarie?.id ||
          null
        }
        profilId={
          profilId
        }
        ficheId={
          ficheSelectionneeId
        }
        ficheIdInitiale={
          ficheSelectionneeId
        }
        email={
          email ||
          null
        }
        onFermer={
          retourAccueil
        }
        onActualiser={() => {
          void chargerDashboard();
        }}
        onModification={() => {
          void chargerDashboard();
        }}
        onOuvrirPv={() =>
          ouvrirPv(
            ficheSelectionneeId
          )
        }
      />
    );
  }

  if (
    vue ===
    "demandes"
  ) {
    return (
      <DemandesMobile
        entrepriseId={
          entrepriseCouranteId
        }
        salarieId={
          salarie?.id ||
          null
        }
        profilId={
          profilId
        }
        email={
          email ||
          null
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
      <ProfilMobile
        entrepriseId={
          entrepriseCouranteId
        }
        salarieId={
          salarie?.id ||
          null
        }
        profilId={
          profilId
        }
        prenom={
          prenom ||
          salarie?.prenom ||
          null
        }
        email={
          email ||
          salarie?.email ||
          null
        }
        onFermer={
          retourAccueil
        }
        onDeconnexion={
          onDeconnexion
        }
      />
    );
  }

  if (
    vue ===
    "planning"
  ) {
    return (
      <main className="salarie-dashboard">
        <header className="salarie-topbar">
          <div>
            <div className="salarie-brand">
              <span className="salarie-brand-mark">
                AB
              </span>

              <span>
                arboboard
              </span>
            </div>

            <p className="salarie-kicker">
              MON PLANNING
            </p>

            <h1>
              Interventions
            </h1>

            <p className="salarie-subtitle">
              Retrouvez les chantiers qui vous sont affectés.
            </p>
          </div>

          <button
            type="button"
            className="salarie-avatar"
            onClick={
              retourAccueil
            }
            aria-label="Retour"
          >
            ‹
          </button>
        </header>

        {banniereHorsLigne()}

        <section className="salarie-section">
          <div className="salarie-actions-grid">
            {fichesPlanning.length ===
            0 ? (
              <section className="salarie-next-card">
                <h3>
                  Aucun chantier planifié
                </h3>

                <p>
                  Les prochaines interventions apparaîtront ici.
                </p>
              </section>
            ) : (
              fichesPlanning.map(
                (
                  fiche
                ) => (
                  <button
                    type="button"
                    key={
                      fiche.id
                    }
                    onClick={() =>
                      ouvrirIntervention(
                        fiche.id
                      )
                    }
                  >
                    <span className="salarie-icon">
                      {heureIntervention(
                        fiche
                      )}
                    </span>

                    <strong>
                      {nomIntervention(
                        fiche
                      )}
                    </strong>

                    <small>
                      {formatDate(
                        dateDebut(
                          fiche
                        )
                      )}
                    </small>

                    <small>
                      {fiche.client_nom ||
                        "Client"}
                    </small>

                    <small>
                      {adresseIntervention(
                        fiche
                      )}
                    </small>
                  </button>
                )
              )
            )}
          </div>
        </section>

        <nav className="salarie-bottom-nav">
          <button
            type="button"
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
            className="active"
          >
            <span>
              ▦
            </span>
            Planning
          </button>

          <button
            type="button"
            onClick={() =>
              setVue(
                "chantiers"
              )
            }
          >
            <span>
              🌳
            </span>
            Chantiers
          </button>

          <button
            type="button"
            onClick={() =>
              setVue(
                "demandes"
              )
            }
          >
            <span>
              ＋
            </span>
            Demandes
          </button>

          <button
            type="button"
            onClick={() =>
              setVue(
                "profil"
              )
            }
          >
            <span>
              ●
            </span>
            Profil
          </button>
        </nav>
      </main>
    );
  }

  if (
    vue ===
    "chantiers"
  ) {
    return (
      <main className="salarie-dashboard">
        <header className="salarie-topbar">
          <div>
            <div className="salarie-brand">
              <span className="salarie-brand-mark">
                AB
              </span>

              <span>
                arboboard
              </span>
            </div>

            <p className="salarie-kicker">
              TERRAIN
            </p>

            <h1>
              Mes chantiers
            </h1>

            <p className="salarie-subtitle">
              Ouvrez une intervention pour commencer ou poursuivre le chantier.
            </p>
          </div>

          <button
            type="button"
            className="salarie-avatar"
            onClick={
              retourAccueil
            }
            aria-label="Retour"
          >
            ‹
          </button>
        </header>

        {banniereHorsLigne()}

        <section className="salarie-section">
          <div className="salarie-actions-grid">
            {fichesPlanning.length ===
            0 ? (
              <section className="salarie-next-card">
                <h3>
                  Aucun chantier
                </h3>

                <p>
                  Aucune intervention ne vous est actuellement affectée.
                </p>
              </section>
            ) : (
              fichesPlanning.map(
                (
                  fiche
                ) => (
                  <button
                    type="button"
                    key={
                      fiche.id
                    }
                    onClick={() =>
                      ouvrirIntervention(
                        fiche.id
                      )
                    }
                  >
                    <span className="salarie-icon">
                      🌳
                    </span>

                    <strong>
                      {nomIntervention(
                        fiche
                      )}
                    </strong>

                    <small>
                      {fiche.client_nom ||
                        "Client"}
                    </small>

                    <small>
                      {texteStatut(
                        fiche.statut
                      )}
                    </small>

                    {fiche.pv_fin_chantier_id ? (
                      <small>
                        ✓ PV enregistré
                      </small>
                    ) : null}
                  </button>
                )
              )
            )}
          </div>
        </section>

        <nav className="salarie-bottom-nav">
          <button
            type="button"
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
            onClick={() =>
              setVue(
                "planning"
              )
            }
          >
            <span>
              ▦
            </span>
            Planning
          </button>

          <button
            type="button"
            className="active"
          >
            <span>
              🌳
            </span>
            Chantiers
          </button>

          <button
            type="button"
            onClick={() =>
              setVue(
                "demandes"
              )
            }
          >
            <span>
              ＋
            </span>
            Demandes
          </button>

          <button
            type="button"
            onClick={() =>
              setVue(
                "profil"
              )
            }
          >
            <span>
              ●
            </span>
            Profil
          </button>
        </nav>
      </main>
    );
  }

  return (
    <main className="salarie-dashboard">
      <header className="salarie-topbar">
        <div>
          <div className="salarie-brand">
            <span className="salarie-brand-mark">
              AB
            </span>

            <span>
              arboboard
            </span>
          </div>

          <p className="salarie-kicker">
            ESPACE SALARIÉ
          </p>

          <h1>
            {prenomAffiche} 👋
          </h1>

          <p className="salarie-subtitle">
            Votre journée terrain, directement sur votre mobile.
          </p>
        </div>

        <button
          type="button"
          className="salarie-avatar"
          onClick={() =>
            setVue(
              "profil"
            )
          }
          aria-label="Mon profil"
          title="Mon profil"
        >
          👤
        </button>
      </header>

      {banniereHorsLigne()}

      {erreur ? (
        <section
          className="salarie-alert"
          role="alert"
        >
          <strong>
            Impossible de charger complètement votre journée
          </strong>

          <p>
            {erreur}
          </p>

          <button
            type="button"
            onClick={() =>
              void chargerDashboard()
            }
          >
            Réessayer
          </button>
        </section>
      ) : null}

      <section className="salarie-today">
        <div className="salarie-today-heading">
          <div>
            <p className="salarie-kicker salarie-kicker-light">
              INTERVENTION DU JOUR
            </p>

            <h2>
              {chargement
                ? "Chargement…"
                : ficheDuJour
                  ? nomIntervention(
                      ficheDuJour
                    )
                  : "Aucune intervention aujourd’hui"}
            </h2>
          </div>

          {ficheDuJour ? (
            <span className="salarie-status">
              {texteStatut(
                ficheDuJour.statut
              )}
            </span>
          ) : null}
        </div>

        {ficheDuJour ? (
          <>
            <p className="salarie-date">
              {formatDate(
                dateDebut(
                  ficheDuJour
                )
              )}
            </p>

            <div className="salarie-client-card">
              <div>
                <span>
                  Client
                </span>

                <strong>
                  {ficheDuJour.client_nom ||
                    "Client"}
                </strong>
              </div>

              <div>
                <span>
                  Adresse
                </span>

                <strong>
                  {adresseIntervention(
                    ficheDuJour
                  )}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="salarie-primary"
              onClick={() =>
                ouvrirIntervention(
                  ficheDuJour.id
                )
              }
            >
              Ouvrir l’intervention
              <span>
                →
              </span>
            </button>
          </>
        ) : (
          <p className="salarie-empty">
            Votre prochaine intervention apparaîtra ici dès qu’elle sera planifiée.
          </p>
        )}
      </section>

      <section className="salarie-section">
        <div className="salarie-section-title">
          <p className="salarie-kicker">
            TERRAIN
          </p>

          <h2>
            Actions rapides
          </h2>
        </div>

        <div className="salarie-actions-grid">
          <button
            type="button"
            onClick={() => {
              if (
                ficheDuJour
              ) {
                ouvrirIntervention(
                  ficheDuJour.id
                );
              }
            }}
            disabled={
              !ficheDuJour
            }
          >
            <span className="salarie-icon">
              ✓
            </span>

            <strong>
              Matériel
            </strong>

            <small>
              Contrôler avant le départ
            </small>
          </button>

          <button
            type="button"
            onClick={() => {
              if (
                ficheDuJour
              ) {
                ouvrirIntervention(
                  ficheDuJour.id
                );
              }
            }}
            disabled={
              !ficheDuJour
            }
          >
            <span className="salarie-icon">
              📍
            </span>

            <strong>
              Arrivée
            </strong>

            <small>
              Valider l’arrivée chantier
            </small>
          </button>

          <button
            type="button"
            onClick={() => {
              if (
                ficheDuJour
              ) {
                ouvrirIntervention(
                  ficheDuJour.id
                );
              }
            }}
            disabled={
              !ficheDuJour
            }
          >
            <span className="salarie-icon">
              📷
            </span>

            <strong>
              Photos
            </strong>

            <small>
              Ajouter les photos terrain
            </small>
          </button>

          <button
            type="button"
            onClick={() => {
              if (
                !ficheDuJour
              ) {
                return;
              }

              if (
                interventionTerminee(
                  ficheDuJour
                )
              ) {
                ouvrirPv(
                  ficheDuJour.id
                );
              } else {
                ouvrirIntervention(
                  ficheDuJour.id
                );
              }
            }}
            disabled={
              !ficheDuJour
            }
          >
            <span className="salarie-icon">
              ✍
            </span>

            <strong>
              Fin / PV
            </strong>

            <small>
              {ficheDuJour?.pv_fin_chantier_id
                ? "PV déjà enregistré"
                : ficheDuJour &&
                    interventionTerminee(
                      ficheDuJour
                    )
                  ? "Faire signer le client"
                  : "Terminer puis signer"}
            </small>
          </button>
        </div>
      </section>

      <section className="salarie-summary">
        <div>
          <span>
            Interventions affectées
          </span>

          <strong>
            {chargement
              ? "…"
              : fiches.length}
          </strong>
        </div>

        <div>
          <span>
            Compte terrain
          </span>

          <strong>
            {salarie
              ? "Associé ✓"
              : "—"}
          </strong>
        </div>
      </section>

      {ficheDuJour &&
      interventionTerminee(
        ficheDuJour
      ) ? (
        <section className="salarie-next-card">
          <p className="salarie-kicker">
            FIN DE CHANTIER
          </p>

          <h3>
            {ficheDuJour.pv_fin_chantier_id
              ? "PV de fin de chantier enregistré ✓"
              : "Le chantier est terminé : faites signer le PV."}
          </h3>

          <p>
            La signature du client peut être faite directement au doigt sur le téléphone.
          </p>

          <button
            type="button"
            className="salarie-primary"
            onClick={() =>
              ouvrirPv(
                ficheDuJour.id
              )
            }
          >
            {ficheDuJour.pv_fin_chantier_id
              ? "Ouvrir le PV"
              : "Faire signer le PV"}

            <span>
              →
            </span>
          </button>
        </section>
      ) : null}

      <nav
        className="salarie-bottom-nav"
        aria-label="Navigation principale"
      >
        <button
          className="active"
          type="button"
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
          onClick={() =>
            setVue(
              "planning"
            )
          }
        >
          <span>
            ▦
          </span>
          Planning
        </button>

        <button
          type="button"
          onClick={() =>
            setVue(
              "chantiers"
            )
          }
        >
          <span>
            🌳
          </span>
          Chantiers
        </button>

        <button
          type="button"
          onClick={() =>
            setVue(
              "demandes"
            )
          }
        >
          <span>
            ＋
          </span>
          Demandes
        </button>

        <button
          type="button"
          onClick={() =>
            setVue(
              "profil"
            )
          }
        >
          <span>
            ●
          </span>
          Profil
        </button>
      </nav>
    </main>
  );
}
