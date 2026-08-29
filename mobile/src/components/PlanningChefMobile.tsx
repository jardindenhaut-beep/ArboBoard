import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import "./PlanningChefMobile.css";

type Props = {
  entrepriseId: string;
  onFermer: () => void;

  onOuvrirIntervention?: (
    ficheId: string
  ) => void;
};

type TypeEvenementPlanning =
  | "rendez_vous"
  | "conge"
  | "absence"
  | "formation"
  | "interne"
  | "indisponibilite"
  | "autre";

type FiltreNature =
  | "tout"
  | "interventions"
  | "evenements";

type FicheIntervention = {
  id: string;
  entreprise_id: string;

  numero: string | null;

  devis_id: string | null;
  facture_id: string | null;

  client_id: string | null;
  client_nom: string | null;

  salarie_id: string | null;
  salarie_nom: string | null;

  titre: string | null;
  type_intervention: string | null;
  statut: string | null;

  date_intervention: string | null;
  heure_debut: string | null;
  heure_fin: string | null;

  date_prevue: string | null;
  date_fin_prevue?: string | null;

  heure_debut_prevue: string | null;
  heure_fin_prevue: string | null;

  heure_debut_reelle: string | null;
  heure_fin_reelle: string | null;

  adresse: string | null;
  code_postal: string | null;
  ville: string | null;

  adresse_chantier: string | null;
  code_postal_chantier: string | null;
  ville_chantier: string | null;

  notes_chantier: string | null;

  travaux_prevus: string | null;
  materiel_prevu: string | null;
  consignes_securite: string | null;
  notes_internes: string | null;

  etape_materiel_statut: string | null;
  etape_arrivee_statut: string | null;
  etape_fin_statut: string | null;

  probleme_signale: boolean | null;
  description_probleme: string | null;

  pv_fin_chantier_id: string | null;

  created_at: string | null;
  updated_at: string | null;
};

type FicheSalarie = {
  id: string;

  entreprise_id: string;

  fiche_id: string;

  salarie_id: string | null;

  salarie_nom: string | null;

  role_chantier: string | null;

  heure_arrivee_prevue: string | null;
  heure_depart_prevue: string | null;

  heure_arrivee_reelle: string | null;
  heure_depart_reelle: string | null;
};

type PlanningEvenement = {
  id: string;

  entreprise_id: string;

  type_evenement:
    | TypeEvenementPlanning
    | string;

  titre: string;

  description: string | null;

  date_debut: string;
  date_fin: string;

  heure_debut: string | null;
  heure_fin: string | null;

  journee_entiere: boolean | null;

  lieu: string | null;

  statut: string | null;

  created_at: string | null;
  updated_at: string | null;
};

type PlanningEvenementSalarie = {
  id: string;

  entreprise_id: string;

  evenement_id: string;

  salarie_id: string;

  salarie_nom: string | null;
};

type SalarieDisponible = {
  id: string;

  nom: string | null;
  prenom: string | null;

  email: string | null;

  statut: string | null;
};

type FormEvenement = {
  id: string;

  type_evenement:
    TypeEvenementPlanning;

  titre: string;

  description: string;

  date_debut: string;
  date_fin: string;

  heure_debut: string;
  heure_fin: string;

  journee_entiere: boolean;

  lieu: string;

  salaries_ids: string[];
};

type ElementJour =
  | {
      nature: "intervention";
      fiche: FicheIntervention;
    }
  | {
      nature: "evenement";
      evenement: PlanningEvenement;
    };

function dateLocaleIso(
  date = new Date()
) {
  const annee =
    date.getFullYear();

  const mois =
    String(
      date.getMonth() + 1
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

function dateDepuisIso(
  dateIso: string
) {
  return new Date(
    `${dateIso}T12:00:00`
  );
}

function ajouterJours(
  dateIso: string,
  jours: number
) {
  const date =
    dateDepuisIso(
      dateIso
    );

  date.setDate(
    date.getDate() +
      jours
  );

  return dateLocaleIso(
    date
  );
}

function debutSemaine(
  dateIso: string
) {
  const date =
    dateDepuisIso(
      dateIso
    );

  const jour =
    date.getDay();

  const decalage =
    jour === 0
      ? -6
      : 1 - jour;

  date.setDate(
    date.getDate() +
      decalage
  );

  return dateLocaleIso(
    date
  );
}

function construireSemaine(
  dateIso: string
) {
  const debut =
    debutSemaine(
      dateIso
    );

  return Array.from(
    {
      length: 7,
    },
    (
      _,
      index
    ) =>
      ajouterJours(
        debut,
        index
      )
  );
}

function formatMoisAnnee(
  dateIso: string
) {
  try {
    const texte =
      new Intl.DateTimeFormat(
        "fr-FR",
        {
          month:
            "long",

          year:
            "numeric",
        }
      ).format(
        dateDepuisIso(
          dateIso
        )
      );

    return (
      texte.charAt(0).toUpperCase() +
      texte.slice(1)
    );
  } catch {
    return dateIso;
  }
}

function formatJourCourt(
  dateIso: string
) {
  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        weekday:
          "short",
      }
    )
      .format(
        dateDepuisIso(
          dateIso
        )
      )
      .replace(
        ".",
        ""
      );
  } catch {
    return "";
  }
}

function formatNumeroJour(
  dateIso: string
) {
  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day:
          "2-digit",
      }
    ).format(
      dateDepuisIso(
        dateIso
      )
    );
  } catch {
    return "";
  }
}

function formatDateLongue(
  dateIso: string
) {
  try {
    const texte =
      new Intl.DateTimeFormat(
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
        dateDepuisIso(
          dateIso
        )
      );

    return (
      texte.charAt(0).toUpperCase() +
      texte.slice(1)
    );
  } catch {
    return dateIso;
  }
}

function formatDateCourte(
  dateIso:
    | string
    | null
    | undefined
) {
  if (!dateIso) {
    return "—";
  }

  try {
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
      dateDepuisIso(
        dateIso
      )
    );
  } catch {
    return dateIso;
  }
}

function formatHeure(
  heure:
    | string
    | null
    | undefined
) {
  if (!heure) {
    return "—";
  }

  return heure.slice(
    0,
    5
  );
}

function dateFiche(
  fiche: FicheIntervention
) {
  return (
    fiche.date_prevue ||
    fiche.date_intervention ||
    ""
  );
}

function heureDebutFiche(
  fiche: FicheIntervention
) {
  return (
    fiche.heure_debut_prevue ||
    fiche.heure_debut ||
    ""
  );
}

function heureFinFiche(
  fiche: FicheIntervention
) {
  return (
    fiche.heure_fin_prevue ||
    fiche.heure_fin ||
    ""
  );
}

function titreFiche(
  fiche: FicheIntervention
) {
  return (
    fiche.titre ||
    fiche.type_intervention ||
    "Intervention"
  );
}

function adresseFiche(
  fiche: FicheIntervention
) {
  const adresse =
    fiche.adresse_chantier ||
    fiche.adresse ||
    "";

  const codePostal =
    fiche.code_postal_chantier ||
    fiche.code_postal ||
    "";

  const ville =
    fiche.ville_chantier ||
    fiche.ville ||
    "";

  const villeComplete =
    [
      codePostal,
      ville,
    ]
      .filter(Boolean)
      .join(" ");

  return [
    adresse,
    villeComplete,
  ]
    .filter(Boolean)
    .join(", ");
}

function libelleStatutFiche(
  statut:
    | string
    | null
    | undefined
) {
  if (
    statut ===
    "planifiee"
  ) {
    return "Planifiée";
  }

  if (
    statut ===
    "en_cours"
  ) {
    return "En cours";
  }

  if (
    statut ===
    "terminee"
  ) {
    return "Terminée";
  }

  if (
    statut ===
    "annulee"
  ) {
    return "Annulée";
  }

  if (
    statut ===
    "archivee"
  ) {
    return "Archivée";
  }

  return "Brouillon";
}

function classeStatutFiche(
  statut:
    | string
    | null
    | undefined
) {
  const valeur =
    statut ||
    "brouillon";

  return `planning-mobile-status planning-mobile-status-${valeur}`;
}

function libelleTypeEvenement(
  type:
    | string
    | null
    | undefined
) {
  if (
    type ===
    "rendez_vous"
  ) {
    return "Rendez-vous";
  }

  if (
    type ===
    "conge"
  ) {
    return "Congé / vacances";
  }

  if (
    type ===
    "absence"
  ) {
    return "Absence";
  }

  if (
    type ===
    "formation"
  ) {
    return "Formation";
  }

  if (
    type ===
    "interne"
  ) {
    return "Événement interne";
  }

  if (
    type ===
    "indisponibilite"
  ) {
    return "Indisponibilité";
  }

  return "Autre";
}

function iconeTypeEvenement(
  type:
    | string
    | null
    | undefined
) {
  if (
    type ===
    "rendez_vous"
  ) {
    return "🤝";
  }

  if (
    type ===
    "conge"
  ) {
    return "🏖";
  }

  if (
    type ===
    "absence"
  ) {
    return "🚫";
  }

  if (
    type ===
    "formation"
  ) {
    return "🎓";
  }

  if (
    type ===
    "interne"
  ) {
    return "🏢";
  }

  if (
    type ===
    "indisponibilite"
  ) {
    return "⛔";
  }

  return "📌";
}

function classeEvenement(
  type:
    | string
    | null
    | undefined
) {
  return `planning-mobile-event planning-mobile-event-${type || "autre"}`;
}

function nomSalarie(
  salarie:
    SalarieDisponible
) {
  const nom =
    `${salarie.prenom || ""} ${
      salarie.nom || ""
    }`.trim();

  return (
    nom ||
    salarie.email ||
    "Salarié"
  );
}

function dateDansEvenement(
  dateIso: string,
  evenement:
    PlanningEvenement
) {
  return (
    dateIso >=
      evenement.date_debut &&
    dateIso <=
      evenement.date_fin
  );
}

function heureEvenement(
  evenement:
    PlanningEvenement
) {
  if (
    evenement.journee_entiere
  ) {
    return "Journée";
  }

  const debut =
    formatHeure(
      evenement.heure_debut
    );

  const fin =
    formatHeure(
      evenement.heure_fin
    );

  if (
    debut !== "—" &&
    fin !== "—"
  ) {
    return `${debut} – ${fin}`;
  }

  return debut;
}

function FORM_EVENEMENT_VIDE(
  date: string
): FormEvenement {
  return {
    id:
      "",

    type_evenement:
      "rendez_vous",

    titre:
      "",

    description:
      "",

    date_debut:
      date,

    date_fin:
      date,

    heure_debut:
      "08:00",

    heure_fin:
      "09:00",

    journee_entiere:
      false,

    lieu:
      "",

    salaries_ids:
      [],
  };
}

export default function PlanningChefMobile({
  entrepriseId,
  onFermer,
  onOuvrirIntervention,
}: Props) {
  const [
    fiches,
    setFiches,
  ] =
    useState<
      FicheIntervention[]
    >([]);

  const [
    equipes,
    setEquipes,
  ] =
    useState<
      FicheSalarie[]
    >([]);

  const [
    evenements,
    setEvenements,
  ] =
    useState<
      PlanningEvenement[]
    >([]);

  const [
    evenementSalaries,
    setEvenementSalaries,
  ] =
    useState<
      PlanningEvenementSalarie[]
    >([]);

  const [
    salaries,
    setSalaries,
  ] =
    useState<
      SalarieDisponible[]
    >([]);

  const [
    dateSelectionnee,
    setDateSelectionnee,
  ] =
    useState(
      dateLocaleIso()
    );

  const [
    filtreNature,
    setFiltreNature,
  ] =
    useState<FiltreNature>(
      "tout"
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
    enregistrement,
    setEnregistrement,
  ] =
    useState(
      false
    );

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

  const [
    ficheOuverte,
    setFicheOuverte,
  ] =
    useState<FicheIntervention | null>(
      null
    );

  const [
    evenementOuvert,
    setEvenementOuvert,
  ] =
    useState<PlanningEvenement | null>(
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
    formEvenement,
    setFormEvenement,
  ] =
    useState<FormEvenement>(
      FORM_EVENEMENT_VIDE(
        dateLocaleIso()
      )
    );

  useEffect(() => {
    void chargerPlanning();
  }, [
    entrepriseId,
  ]);

  async function chargerPlanning() {
    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      const [
        fichesResult,
        evenementsResult,
        affectationsResult,
        salariesResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "fiches_intervention"
            )
            .select(
              "*"
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .or(
              "statut.is.null,statut.neq.archivee"
            )
            .order(
              "date_prevue",
              {
                ascending:
                  true,
              }
            )
            .order(
              "date_intervention",
              {
                ascending:
                  true,
              }
            ),

          supabase
            .from(
              "planning_evenements"
            )
            .select(
              "*"
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .neq(
              "statut",
              "supprime"
            )
            .order(
              "date_debut",
              {
                ascending:
                  true,
              }
            )
            .order(
              "heure_debut",
              {
                ascending:
                  true,
              }
            ),

          supabase
            .from(
              "planning_evenements_salaries"
            )
            .select(
              "*"
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
                nom,
                prenom,
                email,
                statut
              `
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .order(
              "nom",
              {
                ascending:
                  true,
              }
            )
            .order(
              "prenom",
              {
                ascending:
                  true,
              }
            ),
        ]);

      if (
        fichesResult.error
      ) {
        throw fichesResult.error;
      }

      if (
        evenementsResult.error
      ) {
        throw evenementsResult.error;
      }

      if (
        affectationsResult.error
      ) {
        throw affectationsResult.error;
      }

      if (
        salariesResult.error
      ) {
        throw salariesResult.error;
      }

      const fichesChargees =
        (
          fichesResult.data ||
          []
        ) as FicheIntervention[];

      fichesChargees.sort(
        (
          a,
          b
        ) => {
          const dateA =
            dateFiche(
              a
            ) ||
            "9999-12-31";

          const dateB =
            dateFiche(
              b
            ) ||
            "9999-12-31";

          if (
            dateA !==
            dateB
          ) {
            return dateA.localeCompare(
              dateB
            );
          }

          return (
            heureDebutFiche(
              a
            ) ||
            "99:99"
          ).localeCompare(
            heureDebutFiche(
              b
            ) ||
              "99:99"
          );
        }
      );

      setFiches(
        fichesChargees
      );

      setEvenements(
        (
          evenementsResult.data ||
          []
        ) as PlanningEvenement[]
      );

      setEvenementSalaries(
        (
          affectationsResult.data ||
          []
        ) as PlanningEvenementSalarie[]
      );

      setSalaries(
        (
          salariesResult.data ||
          []
        ) as SalarieDisponible[]
      );

      const idsFiches =
        fichesChargees.map(
          (
            fiche
          ) =>
            fiche.id
        );

      if (
        idsFiches.length ===
        0
      ) {
        setEquipes(
          []
        );
      } else {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "fiches_intervention_salaries"
            )
            .select(
              "*"
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .in(
              "fiche_id",
              idsFiches
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              }
            );

        if (error) {
          throw error;
        }

        setEquipes(
          (
            data ||
            []
          ) as FicheSalarie[]
        );
      }
    } catch (error) {
      console.error(
        "Chargement planning mobile :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger le planning."
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  function equipeFiche(
    fiche:
      FicheIntervention
  ) {
    const affectations =
      equipes.filter(
        (
          item
        ) =>
          item.fiche_id ===
          fiche.id
      );

    if (
      affectations.length >
      0
    ) {
      return affectations;
    }

    if (
      fiche.salarie_id ||
      fiche.salarie_nom
    ) {
      return [
        {
          id:
            `legacy-${fiche.id}`,

          entreprise_id:
            fiche.entreprise_id,

          fiche_id:
            fiche.id,

          salarie_id:
            fiche.salarie_id,

          salarie_nom:
            fiche.salarie_nom,

          role_chantier:
            "Intervenant",

          heure_arrivee_prevue:
            fiche.heure_debut_prevue ||
            fiche.heure_debut,

          heure_depart_prevue:
            fiche.heure_fin_prevue ||
            fiche.heure_fin,

          heure_arrivee_reelle:
            fiche.heure_debut_reelle,

          heure_depart_reelle:
            fiche.heure_fin_reelle,
        },
      ] as FicheSalarie[];
    }

    return [];
  }

  function salariesEvenement(
    evenementId: string
  ) {
    return evenementSalaries.filter(
      (
        item
      ) =>
        item.evenement_id ===
        evenementId
    );
  }

  function ouvrirIntervention(
    fiche:
      FicheIntervention
  ) {
    if (
      onOuvrirIntervention
    ) {
      onOuvrirIntervention(
        fiche.id
      );

      return;
    }

    setFicheOuverte(
      fiche
    );

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }

  const joursSemaine =
    useMemo(
      () =>
        construireSemaine(
          dateSelectionnee
        ),
      [
        dateSelectionnee,
      ]
    );

  function nombreElementsJour(
    date: string
  ) {
    const interventions =
      fiches.filter(
        (
          fiche
        ) =>
          dateFiche(
            fiche
          ) ===
          date
      ).length;

    const events =
      evenements.filter(
        (
          evenement
        ) =>
          dateDansEvenement(
            date,
            evenement
          )
      ).length;

    return (
      interventions +
      events
    );
  }

  const elementsJour =
    useMemo(() => {
      const resultat:
        ElementJour[] =
        [];

      if (
        filtreNature !==
        "evenements"
      ) {
        fiches.forEach(
          (
            fiche
          ) => {
            if (
              dateFiche(
                fiche
              ) ===
              dateSelectionnee
            ) {
              resultat.push({
                nature:
                  "intervention",

                fiche,
              });
            }
          }
        );
      }

      if (
        filtreNature !==
        "interventions"
      ) {
        evenements.forEach(
          (
            evenement
          ) => {
            if (
              dateDansEvenement(
                dateSelectionnee,
                evenement
              )
            ) {
              resultat.push({
                nature:
                  "evenement",

                evenement,
              });
            }
          }
        );
      }

      const texte =
        recherche
          .trim()
          .toLowerCase();

      const filtres =
        texte
          ? resultat.filter(
              (
                element
              ) => {
                if (
                  element.nature ===
                  "intervention"
                ) {
                  const fiche =
                    element.fiche;

                  const equipe =
                    equipeFiche(
                      fiche
                    )
                      .map(
                        (
                          item
                        ) =>
                          item.salarie_nom ||
                          ""
                      )
                      .join(
                        " "
                      );

                  return [
                    fiche.numero,
                    fiche.client_nom,
                    fiche.titre,
                    fiche.type_intervention,
                    fiche.ville_chantier,
                    fiche.ville,
                    fiche.notes_chantier,
                    equipe,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(
                      texte
                    );
                }

                const evenement =
                  element.evenement;

                const affectations =
                  salariesEvenement(
                    evenement.id
                  )
                    .map(
                      (
                        item
                      ) =>
                        item.salarie_nom ||
                        ""
                    )
                    .join(
                      " "
                    );

                return [
                  evenement.titre,
                  evenement.description,
                  evenement.lieu,
                  libelleTypeEvenement(
                    evenement.type_evenement
                  ),
                  affectations,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase()
                  .includes(
                    texte
                  );
              }
            )
          : resultat;

      filtres.sort(
        (
          a,
          b
        ) => {
          const heureA =
            a.nature ===
            "intervention"
              ? heureDebutFiche(
                  a.fiche
                ) ||
                "99:99"
              : a.evenement
                    .journee_entiere
                ? "00:00"
                : a.evenement
                      .heure_debut ||
                  "99:99";

          const heureB =
            b.nature ===
            "intervention"
              ? heureDebutFiche(
                  b.fiche
                ) ||
                "99:99"
              : b.evenement
                    .journee_entiere
                ? "00:00"
                : b.evenement
                      .heure_debut ||
                  "99:99";

          return heureA.localeCompare(
            heureB
          );
        }
      );

      return filtres;
    }, [
      fiches,
      evenements,
      equipes,
      evenementSalaries,
      dateSelectionnee,
      filtreNature,
      recherche,
    ]);

  const statistiquesJour =
    useMemo(() => {
      const interventions =
        fiches.filter(
          (
            fiche
          ) =>
            dateFiche(
              fiche
            ) ===
            dateSelectionnee
        );

      const events =
        evenements.filter(
          (
            evenement
          ) =>
            dateDansEvenement(
              dateSelectionnee,
              evenement
            )
        );

      return {
        interventions:
          interventions.length,

        enCours:
          interventions.filter(
            (
              fiche
            ) =>
              fiche.statut ===
              "en_cours"
          ).length,

        problemes:
          interventions.filter(
            (
              fiche
            ) =>
              fiche.probleme_signale ===
              true
          ).length,

        evenements:
          events.length,
      };
    }, [
      fiches,
      evenements,
      dateSelectionnee,
    ]);

  function semainePrecedente() {
    setDateSelectionnee(
      ajouterJours(
        dateSelectionnee,
        -7
      )
    );
  }

  function semaineSuivante() {
    setDateSelectionnee(
      ajouterJours(
        dateSelectionnee,
        7
      )
    );
  }

  function revenirAujourdhui() {
    setDateSelectionnee(
      dateLocaleIso()
    );
  }

  function ouvrirNouvelEvenement() {
    setFormEvenement(
      FORM_EVENEMENT_VIDE(
        dateSelectionnee
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

  function ouvrirEditionEvenement(
    evenement:
      PlanningEvenement
  ) {
    setFormEvenement({
      id:
        evenement.id,

      type_evenement:
        (
          [
            "rendez_vous",
            "conge",
            "absence",
            "formation",
            "interne",
            "indisponibilite",
            "autre",
          ].includes(
            evenement.type_evenement
          )
            ? evenement.type_evenement
            : "autre"
        ) as TypeEvenementPlanning,

      titre:
        evenement.titre ||
        "",

      description:
        evenement.description ||
        "",

      date_debut:
        evenement.date_debut,

      date_fin:
        evenement.date_fin,

      heure_debut:
        evenement.heure_debut?.slice(
          0,
          5
        ) ||
        "08:00",

      heure_fin:
        evenement.heure_fin?.slice(
          0,
          5
        ) ||
        "09:00",

      journee_entiere:
        evenement.journee_entiere ===
        true,

      lieu:
        evenement.lieu ||
        "",

      salaries_ids:
        salariesEvenement(
          evenement.id
        ).map(
          (
            item
          ) =>
            item.salarie_id
        ),
    });

    setEvenementOuvert(
      null
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

    setFormEvenement(
      FORM_EVENEMENT_VIDE(
        dateSelectionnee
      )
    );

    setErreur(
      ""
    );
  }

  function modifierChamp<
    K extends keyof FormEvenement
  >(
    champ: K,
    valeur:
      FormEvenement[K]
  ) {
    setFormEvenement(
      (
        ancien
      ) => ({
        ...ancien,

        [champ]:
          valeur,
      })
    );
  }

  function basculerSalarie(
    salarieId:
      string
  ) {
    setFormEvenement(
      (
        ancien
      ) => ({
        ...ancien,

        salaries_ids:
          ancien.salaries_ids.includes(
            salarieId
          )
            ? ancien.salaries_ids.filter(
                (
                  id
                ) =>
                  id !==
                  salarieId
              )
            : [
                ...ancien.salaries_ids,
                salarieId,
              ],
      })
    );
  }

  async function enregistrerEvenement() {
    if (
      !formEvenement.titre.trim()
    ) {
      setErreur(
        "Le titre de l’événement est obligatoire."
      );

      return;
    }

    if (
      !formEvenement.date_debut ||
      !formEvenement.date_fin
    ) {
      setErreur(
        "Les dates sont obligatoires."
      );

      return;
    }

    if (
      formEvenement.date_fin <
      formEvenement.date_debut
    ) {
      setErreur(
        "La date de fin ne peut pas être avant la date de début."
      );

      return;
    }

    if (
      !formEvenement.journee_entiere &&
      formEvenement.date_debut ===
        formEvenement.date_fin &&
      formEvenement.heure_fin <=
        formEvenement.heure_debut
    ) {
      setErreur(
        "L’heure de fin doit être après l’heure de début."
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

        type_evenement:
          formEvenement.type_evenement,

        titre:
          formEvenement.titre.trim(),

        description:
          formEvenement.description.trim() ||
          null,

        date_debut:
          formEvenement.date_debut,

        date_fin:
          formEvenement.date_fin,

        heure_debut:
          formEvenement.journee_entiere
            ? null
            : formEvenement.heure_debut,

        heure_fin:
          formEvenement.journee_entiere
            ? null
            : formEvenement.heure_fin,

        journee_entiere:
          formEvenement.journee_entiere,

        lieu:
          formEvenement.lieu.trim() ||
          null,

        statut:
          "actif",

        updated_at:
          new Date().toISOString(),
      };

      let evenementId =
        formEvenement.id;

      if (
        formEvenement.id
      ) {
        const {
          error,
        } =
          await supabase
            .from(
              "planning_evenements"
            )
            .update(
              payload
            )
            .eq(
              "entreprise_id",
              entrepriseId
            )
            .eq(
              "id",
              formEvenement.id
            );

        if (error) {
          throw error;
        }
      } else {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "planning_evenements"
            )
            .insert(
              payload
            )
            .select(
              "id"
            )
            .single();

        if (
          error ||
          !data?.id
        ) {
          throw (
            error ||
            new Error(
              "Événement créé mais identifiant introuvable."
            )
          );
        }

        evenementId =
          data.id;
      }

      const {
        error:
          deleteError,
      } =
        await supabase
          .from(
            "planning_evenements_salaries"
          )
          .delete()
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "evenement_id",
            evenementId
          );

      if (
        deleteError
      ) {
        throw deleteError;
      }

      if (
        formEvenement.salaries_ids.length >
        0
      ) {
        const lignes =
          formEvenement.salaries_ids.map(
            (
              salarieId
            ) => {
              const salarie =
                salaries.find(
                  (
                    item
                  ) =>
                    item.id ===
                    salarieId
                );

              return {
                entreprise_id:
                  entrepriseId,

                evenement_id:
                  evenementId,

                salarie_id:
                  salarieId,

                salarie_nom:
                  salarie
                    ? nomSalarie(
                        salarie
                      )
                    : null,
              };
            }
          );

        const {
          error,
        } =
          await supabase
            .from(
              "planning_evenements_salaries"
            )
            .insert(
              lignes
            );

        if (error) {
          throw error;
        }
      }

      const edition =
        Boolean(
          formEvenement.id
        );

      const dateFinale =
        formEvenement.date_debut;

      setFormulaireOuvert(
        false
      );

      setFormEvenement(
        FORM_EVENEMENT_VIDE(
          dateFinale
        )
      );

      setDateSelectionnee(
        dateFinale
      );

      await chargerPlanning();

      setMessage(
        edition
          ? "Événement modifié."
          : "Événement ajouté au planning."
      );
    } catch (error) {
      console.error(
        "Enregistrement événement mobile :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer cet événement."
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  async function supprimerEvenement(
    evenement:
      PlanningEvenement
  ) {
    const confirmation =
      window.confirm(
        `Supprimer « ${evenement.titre} » du planning ?`
      );

    if (
      !confirmation
    ) {
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

      const {
        error,
      } =
        await supabase
          .from(
            "planning_evenements"
          )
          .update({
            statut:
              "supprime",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "id",
            evenement.id
          );

      if (error) {
        throw error;
      }

      setEvenementOuvert(
        null
      );

      await chargerPlanning();

      setMessage(
        "Événement supprimé du planning."
      );
    } catch (error) {
      console.error(
        "Suppression événement mobile :",
        error
      );

      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer cet événement."
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  /*
   * ======================================================
   * FORMULAIRE EVENEMENT
   * ======================================================
   */

  if (
    formulaireOuvert
  ) {
    return (
      <main className="planning-mobile">
        <header className="planning-mobile-header">
          <button
            type="button"
            className="planning-mobile-back"
            onClick={
              fermerFormulaire
            }
          >
            ‹
          </button>

          <div>
            <h1>
              {formEvenement.id
                ? "Modifier l’événement"
                : "Nouvel événement"}
            </h1>

            <span>
              Planning Chef
            </span>
          </div>

          <div className="planning-mobile-header-space" />
        </header>

        <div className="planning-mobile-form-content">
          {erreur ? (
            <div className="planning-mobile-error">
              {erreur}
            </div>
          ) : null}

          <section className="planning-mobile-form-card">
            <span className="planning-mobile-eyebrow">
              TYPE
            </span>

            <div className="planning-mobile-event-types">
              {(
                [
                  "rendez_vous",
                  "conge",
                  "absence",
                  "formation",
                  "interne",
                  "indisponibilite",
                  "autre",
                ] as TypeEvenementPlanning[]
              ).map(
                (
                  type
                ) => (
                  <button
                    type="button"
                    key={
                      type
                    }
                    className={
                      formEvenement.type_evenement ===
                      type
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      modifierChamp(
                        "type_evenement",
                        type
                      )
                    }
                  >
                    <span>
                      {iconeTypeEvenement(
                        type
                      )}
                    </span>

                    <small>
                      {libelleTypeEvenement(
                        type
                      )}
                    </small>
                  </button>
                )
              )}
            </div>
          </section>

          <section className="planning-mobile-form-card">
            <h2>
              Informations
            </h2>

            <label className="planning-mobile-field">
              <span>
                Titre *
              </span>

              <input
                type="text"
                value={
                  formEvenement.titre
                }
                onChange={(
                  event
                ) =>
                  modifierChamp(
                    "titre",
                    event.target.value
                  )
                }
                placeholder="Ex : Rendez-vous client"
              />
            </label>

            <label className="planning-mobile-field">
              <span>
                Lieu
              </span>

              <input
                type="text"
                value={
                  formEvenement.lieu
                }
                onChange={(
                  event
                ) =>
                  modifierChamp(
                    "lieu",
                    event.target.value
                  )
                }
                placeholder="Adresse ou lieu"
              />
            </label>

            <label className="planning-mobile-field">
              <span>
                Description
              </span>

              <textarea
                rows={
                  4
                }
                value={
                  formEvenement.description
                }
                onChange={(
                  event
                ) =>
                  modifierChamp(
                    "description",
                    event.target.value
                  )
                }
                placeholder="Informations utiles..."
              />
            </label>
          </section>

          <section className="planning-mobile-form-card">
            <div className="planning-mobile-form-title">
              <h2>
                Date et heure
              </h2>

              <label className="planning-mobile-switch-row">
                <input
                  type="checkbox"
                  checked={
                    formEvenement.journee_entiere
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "journee_entiere",
                      event.target.checked
                    )
                  }
                />

                <span>
                  Journée entière
                </span>
              </label>
            </div>

            <div className="planning-mobile-form-grid">
              <label className="planning-mobile-field">
                <span>
                  Du
                </span>

                <input
                  type="date"
                  value={
                    formEvenement.date_debut
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "date_debut",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="planning-mobile-field">
                <span>
                  Au
                </span>

                <input
                  type="date"
                  value={
                    formEvenement.date_fin
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "date_fin",
                      event.target.value
                    )
                  }
                />
              </label>
            </div>

            {!formEvenement.journee_entiere ? (
              <div className="planning-mobile-form-grid">
                <label className="planning-mobile-field">
                  <span>
                    Début
                  </span>

                  <input
                    type="time"
                    value={
                      formEvenement.heure_debut
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "heure_debut",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="planning-mobile-field">
                  <span>
                    Fin
                  </span>

                  <input
                    type="time"
                    value={
                      formEvenement.heure_fin
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "heure_fin",
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>
            ) : null}
          </section>

          <section className="planning-mobile-form-card">
            <div className="planning-mobile-form-title">
              <div>
                <h2>
                  Équipe
                </h2>

                <small>
                  Facultatif
                </small>
              </div>

              <span className="planning-mobile-count">
                {
                  formEvenement.salaries_ids.length
                }
              </span>
            </div>

            {salaries.length ===
            0 ? (
              <div className="planning-mobile-no-data">
                Aucun salarié disponible.
              </div>
            ) : (
              <div className="planning-mobile-employees">
                {salaries.map(
                  (
                    salarie
                  ) => {
                    const actif =
                      formEvenement.salaries_ids.includes(
                        salarie.id
                      );

                    return (
                      <button
                        type="button"
                        key={
                          salarie.id
                        }
                        className={
                          actif
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          basculerSalarie(
                            salarie.id
                          )
                        }
                      >
                        <span className="planning-mobile-employee-avatar">
                          👤
                        </span>

                        <strong>
                          {nomSalarie(
                            salarie
                          )}
                        </strong>

                        <span className="planning-mobile-employee-check">
                          {actif
                            ? "✓"
                            : ""}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <div className="planning-mobile-form-actions">
            <button
              type="button"
              className="planning-mobile-primary"
              disabled={
                enregistrement
              }
              onClick={() =>
                void enregistrerEvenement()
              }
            >
              {enregistrement
                ? "Enregistrement…"
                : formEvenement.id
                  ? "✓ Enregistrer les modifications"
                  : "✓ Ajouter au planning"}
            </button>

            <button
              type="button"
              className="planning-mobile-secondary"
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
   * DETAIL INTERVENTION
   * ======================================================
   */

  if (
    ficheOuverte
  ) {
    const equipe =
      equipeFiche(
        ficheOuverte
      );

    const adresse =
      adresseFiche(
        ficheOuverte
      );

    return (
      <main className="planning-mobile">
        <header className="planning-mobile-header">
          <button
            type="button"
            className="planning-mobile-back"
            onClick={() =>
              setFicheOuverte(
                null
              )
            }
          >
            ‹
          </button>

          <div>
            <h1>
              Intervention
            </h1>

            <span>
              {ficheOuverte.numero ||
                "Fiche chantier"}
            </span>
          </div>

          <div className="planning-mobile-header-space" />
        </header>

        <div className="planning-mobile-detail-content">
          <section className="planning-mobile-intervention-hero">
            <span
              className={classeStatutFiche(
                ficheOuverte.statut
              )}
            >
              {libelleStatutFiche(
                ficheOuverte.statut
              )}
            </span>

            <h2>
              {titreFiche(
                ficheOuverte
              )}
            </h2>

            <p>
              {ficheOuverte.client_nom ||
                "Client non renseigné"}
            </p>

            {ficheOuverte.probleme_signale ? (
              <div className="planning-mobile-problem">
                ⚠ Problème signalé
              </div>
            ) : null}
          </section>

          <section className="planning-mobile-detail-card">
            <h3>
              Planning
            </h3>

            <div className="planning-mobile-info-row">
              <span>
                Date
              </span>

              <strong>
                {formatDateLongue(
                  dateFiche(
                    ficheOuverte
                  )
                )}
              </strong>
            </div>

            <div className="planning-mobile-info-row">
              <span>
                Horaires prévus
              </span>

              <strong>
                {formatHeure(
                  heureDebutFiche(
                    ficheOuverte
                  )
                )}{" "}
                –{" "}
                {formatHeure(
                  heureFinFiche(
                    ficheOuverte
                  )
                )}
              </strong>
            </div>

            {adresse ? (
              <div className="planning-mobile-info-row">
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
          </section>

          <section className="planning-mobile-detail-card">
            <div className="planning-mobile-section-heading">
              <h3>
                Équipe
              </h3>

              <span>
                {
                  equipe.length
                }
              </span>
            </div>

            {equipe.length ===
            0 ? (
              <div className="planning-mobile-no-data">
                Aucun salarié affecté.
              </div>
            ) : (
              <div className="planning-mobile-team-list">
                {equipe.map(
                  (
                    membre
                  ) => (
                    <div
                      key={
                        membre.id
                      }
                    >
                      <span>
                        👤
                      </span>

                      <div>
                        <strong>
                          {membre.salarie_nom ||
                            "Salarié"}
                        </strong>

                        <small>
                          {membre.role_chantier ||
                            "Intervenant"}
                        </small>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {ficheOuverte.travaux_prevus ? (
            <section className="planning-mobile-detail-card">
              <h3>
                Travaux prévus
              </h3>

              <p className="planning-mobile-text">
                {
                  ficheOuverte.travaux_prevus
                }
              </p>
            </section>
          ) : null}

          {ficheOuverte.materiel_prevu ? (
            <section className="planning-mobile-detail-card">
              <h3>
                Matériel prévu
              </h3>

              <p className="planning-mobile-text">
                {
                  ficheOuverte.materiel_prevu
                }
              </p>
            </section>
          ) : null}

          {ficheOuverte.consignes_securite ? (
            <section className="planning-mobile-detail-card">
              <h3>
                Sécurité
              </h3>

              <p className="planning-mobile-text">
                {
                  ficheOuverte.consignes_securite
                }
              </p>
            </section>
          ) : null}

          {ficheOuverte.notes_chantier ? (
            <section className="planning-mobile-detail-card">
              <h3>
                Notes chantier
              </h3>

              <p className="planning-mobile-text">
                {
                  ficheOuverte.notes_chantier
                }
              </p>
            </section>
          ) : null}

          {ficheOuverte.probleme_signale &&
          ficheOuverte.description_probleme ? (
            <section className="planning-mobile-detail-card planning-mobile-detail-problem">
              <h3>
                Problème signalé
              </h3>

              <p className="planning-mobile-text">
                {
                  ficheOuverte.description_probleme
                }
              </p>
            </section>
          ) : null}

          {onOuvrirIntervention ? (
            <div className="planning-mobile-detail-actions">
              <button
                type="button"
                className="planning-mobile-primary"
                onClick={() =>
                  onOuvrirIntervention(
                    ficheOuverte.id
                  )
                }
              >
                Ouvrir la fiche complète
              </button>
            </div>
          ) : (
            <div className="planning-mobile-readonly-note">
              Aperçu de la fiche d’intervention.
            </div>
          )}
        </div>
      </main>
    );
  }

  /*
   * ======================================================
   * DETAIL EVENEMENT
   * ======================================================
   */

  if (
    evenementOuvert
  ) {
    const affectations =
      salariesEvenement(
        evenementOuvert.id
      );

    return (
      <main className="planning-mobile">
        <header className="planning-mobile-header">
          <button
            type="button"
            className="planning-mobile-back"
            onClick={() =>
              setEvenementOuvert(
                null
              )
            }
          >
            ‹
          </button>

          <div>
            <h1>
              Événement
            </h1>

            <span>
              {libelleTypeEvenement(
                evenementOuvert.type_evenement
              )}
            </span>
          </div>

          <button
            type="button"
            className="planning-mobile-edit-header"
            onClick={() =>
              ouvrirEditionEvenement(
                evenementOuvert
              )
            }
          >
            ✎
          </button>
        </header>

        <div className="planning-mobile-detail-content">
          {erreur ? (
            <div className="planning-mobile-error">
              {erreur}
            </div>
          ) : null}

          <section
            className={`planning-mobile-event-hero ${classeEvenement(
              evenementOuvert.type_evenement
            )}`}
          >
            <span>
              {iconeTypeEvenement(
                evenementOuvert.type_evenement
              )}
            </span>

            <div>
              <small>
                {libelleTypeEvenement(
                  evenementOuvert.type_evenement
                )}
              </small>

              <h2>
                {
                  evenementOuvert.titre
                }
              </h2>
            </div>
          </section>

          <section className="planning-mobile-detail-card">
            <h3>
              Date et heure
            </h3>

            <div className="planning-mobile-info-row">
              <span>
                Début
              </span>

              <strong>
                {formatDateCourte(
                  evenementOuvert.date_debut
                )}
              </strong>
            </div>

            {evenementOuvert.date_fin !==
            evenementOuvert.date_debut ? (
              <div className="planning-mobile-info-row">
                <span>
                  Fin
                </span>

                <strong>
                  {formatDateCourte(
                    evenementOuvert.date_fin
                  )}
                </strong>
              </div>
            ) : null}

            <div className="planning-mobile-info-row">
              <span>
                Horaire
              </span>

              <strong>
                {heureEvenement(
                  evenementOuvert
                )}
              </strong>
            </div>

            {evenementOuvert.lieu ? (
              <div className="planning-mobile-info-row">
                <span>
                  Lieu
                </span>

                <strong>
                  {
                    evenementOuvert.lieu
                  }
                </strong>
              </div>
            ) : null}
          </section>

          {affectations.length >
          0 ? (
            <section className="planning-mobile-detail-card">
              <div className="planning-mobile-section-heading">
                <h3>
                  Salariés
                </h3>

                <span>
                  {
                    affectations.length
                  }
                </span>
              </div>

              <div className="planning-mobile-team-list">
                {affectations.map(
                  (
                    affectation
                  ) => (
                    <div
                      key={
                        affectation.id
                      }
                    >
                      <span>
                        👤
                      </span>

                      <div>
                        <strong>
                          {affectation.salarie_nom ||
                            "Salarié"}
                        </strong>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          ) : null}

          {evenementOuvert.description ? (
            <section className="planning-mobile-detail-card">
              <h3>
                Description
              </h3>

              <p className="planning-mobile-text">
                {
                  evenementOuvert.description
                }
              </p>
            </section>
          ) : null}

          <div className="planning-mobile-detail-actions">
            <button
              type="button"
              className="planning-mobile-primary"
              disabled={
                enregistrement
              }
              onClick={() =>
                ouvrirEditionEvenement(
                  evenementOuvert
                )
              }
            >
              ✎ Modifier
            </button>

            <button
              type="button"
              className="planning-mobile-danger"
              disabled={
                enregistrement
              }
              onClick={() =>
                void supprimerEvenement(
                  evenementOuvert
                )
              }
            >
              Supprimer du planning
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ======================================================
   * PLANNING PRINCIPAL
   * ======================================================
   */

  return (
    <main className="planning-mobile">
      <header className="planning-mobile-header">
        <button
          type="button"
          className="planning-mobile-back"
          onClick={
            onFermer
          }
        >
          ‹
        </button>

        <div>
          <h1>
            Planning
          </h1>

          <span>
            Chef
          </span>
        </div>

        <button
          type="button"
          className="planning-mobile-add-header"
          onClick={
            ouvrirNouvelEvenement
          }
        >
          ＋
        </button>
      </header>

      <div className="planning-mobile-content">
        {erreur ? (
          <div className="planning-mobile-error">
            {erreur}

            <button
              type="button"
              onClick={() =>
                void chargerPlanning()
              }
            >
              Réessayer
            </button>
          </div>
        ) : null}

        {message ? (
          <div className="planning-mobile-success">
            {message}
          </div>
        ) : null}

        <section className="planning-mobile-calendar-card">
          <div className="planning-mobile-calendar-top">
            <button
              type="button"
              onClick={
                semainePrecedente
              }
            >
              ‹
            </button>

            <div>
              <strong>
                {formatMoisAnnee(
                  dateSelectionnee
                )}
              </strong>

              <button
                type="button"
                onClick={
                  revenirAujourdhui
                }
              >
                Aujourd’hui
              </button>
            </div>

            <button
              type="button"
              onClick={
                semaineSuivante
              }
            >
              ›
            </button>
          </div>

          <div className="planning-mobile-week">
            {joursSemaine.map(
              (
                jour
              ) => {
                const actif =
                  jour ===
                  dateSelectionnee;

                const aujourdHui =
                  jour ===
                  dateLocaleIso();

                const nombre =
                  nombreElementsJour(
                    jour
                  );

                return (
                  <button
                    type="button"
                    key={
                      jour
                    }
                    className={`${actif ? "active" : ""} ${
                      aujourdHui
                        ? "today"
                        : ""
                    }`}
                    onClick={() =>
                      setDateSelectionnee(
                        jour
                      )
                    }
                  >
                    <small>
                      {formatJourCourt(
                        jour
                      )}
                    </small>

                    <strong>
                      {formatNumeroJour(
                        jour
                      )}
                    </strong>

                    <span
                      className={
                        nombre >
                        0
                          ? "has-items"
                          : ""
                      }
                    >
                      {nombre >
                      0
                        ? nombre
                        : ""}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </section>

        <section className="planning-mobile-day-title">
          <div>
            <span>
              JOURNÉE
            </span>

            <h2>
              {formatDateLongue(
                dateSelectionnee
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              void chargerPlanning()
            }
          >
            ↻
          </button>
        </section>

        <section className="planning-mobile-day-stats">
          <div>
            <strong>
              {
                statistiquesJour.interventions
              }
            </strong>

            <span>
              Chantiers
            </span>
          </div>

          <div>
            <strong>
              {
                statistiquesJour.evenements
              }
            </strong>

            <span>
              Événements
            </span>
          </div>

          <div>
            <strong>
              {
                statistiquesJour.enCours
              }
            </strong>

            <span>
              En cours
            </span>
          </div>

          <div
            className={
              statistiquesJour.problemes >
              0
                ? "planning-mobile-stat-problem"
                : ""
            }
          >
            <strong>
              {
                statistiquesJour.problemes
              }
            </strong>

            <span>
              Alertes
            </span>
          </div>
        </section>

        <label className="planning-mobile-search">
          <span>
            🔎
          </span>

          <input
            type="search"
            value={
              recherche
            }
            placeholder="Client, chantier, salarié..."
            onChange={(
              event
            ) =>
              setRecherche(
                event.target.value
              )
            }
          />
        </label>

        <div className="planning-mobile-filters">
          <button
            type="button"
            className={
              filtreNature ===
              "tout"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreNature(
                "tout"
              )
            }
          >
            Tout
          </button>

          <button
            type="button"
            className={
              filtreNature ===
              "interventions"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreNature(
                "interventions"
              )
            }
          >
            Chantiers
          </button>

          <button
            type="button"
            className={
              filtreNature ===
              "evenements"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltreNature(
                "evenements"
              )
            }
          >
            Événements
          </button>
        </div>

        {chargement ? (
          <div className="planning-mobile-loading">
            <div className="planning-mobile-spinner" />

            <span>
              Chargement du planning…
            </span>
          </div>
        ) : elementsJour.length ===
          0 ? (
          <div className="planning-mobile-empty">
            <div>
              📅
            </div>

            <strong>
              Journée libre
            </strong>

            <span>
              Aucun chantier ni événement pour cette date.
            </span>

            <button
              type="button"
              onClick={
                ouvrirNouvelEvenement
              }
            >
              ＋ Ajouter un événement
            </button>
          </div>
        ) : (
          <div className="planning-mobile-day-list">
            {elementsJour.map(
              (
                element
              ) => {
                if (
                  element.nature ===
                  "evenement"
                ) {
                  const evenement =
                    element.evenement;

                  const affectations =
                    salariesEvenement(
                      evenement.id
                    );

                  return (
                    <button
                      type="button"
                      key={
                        `event-${evenement.id}`
                      }
                      className={classeEvenement(
                        evenement.type_evenement
                      )}
                      onClick={() =>
                        setEvenementOuvert(
                          evenement
                        )
                      }
                    >
                      <div className="planning-mobile-event-time">
                        <span>
                          {iconeTypeEvenement(
                            evenement.type_evenement
                          )}
                        </span>

                        <small>
                          {heureEvenement(
                            evenement
                          )}
                        </small>
                      </div>

                      <div className="planning-mobile-event-main">
                        <span>
                          {libelleTypeEvenement(
                            evenement.type_evenement
                          )}
                        </span>

                        <strong>
                          {
                            evenement.titre
                          }
                        </strong>

                        {evenement.lieu ? (
                          <small>
                            📍{" "}
                            {
                              evenement.lieu
                            }
                          </small>
                        ) : null}

                        {affectations.length >
                        0 ? (
                          <small>
                            👤{" "}
                            {affectations
                              .map(
                                (
                                  item
                                ) =>
                                  item.salarie_nom
                              )
                              .filter(Boolean)
                              .join(
                                ", "
                              )}
                          </small>
                        ) : null}
                      </div>

                      <b>
                        ›
                      </b>
                    </button>
                  );
                }

                const fiche =
                  element.fiche;

                const equipe =
                  equipeFiche(
                    fiche
                  );

                return (
                  <button
                    type="button"
                    key={
                      `fiche-${fiche.id}`
                    }
                    className={`planning-mobile-job ${
                      fiche.probleme_signale
                        ? "planning-mobile-job-problem"
                        : ""
                    }`}
                    onClick={() =>
                      ouvrirIntervention(
                        fiche
                      )
                    }
                  >
                    <div className="planning-mobile-job-time">
                      <strong>
                        {formatHeure(
                          heureDebutFiche(
                            fiche
                          )
                        )}
                      </strong>

                      <small>
                        {formatHeure(
                          heureFinFiche(
                            fiche
                          )
                        )}
                      </small>
                    </div>

                    <div className="planning-mobile-job-main">
                      <div className="planning-mobile-job-top">
                        <span
                          className={classeStatutFiche(
                            fiche.statut
                          )}
                        >
                          {libelleStatutFiche(
                            fiche.statut
                          )}
                        </span>

                        {fiche.probleme_signale ? (
                          <em>
                            ⚠
                          </em>
                        ) : null}
                      </div>

                      <strong>
                        {titreFiche(
                          fiche
                        )}
                      </strong>

                      <span>
                        {fiche.client_nom ||
                          "Client non renseigné"}
                      </span>

                      {equipe.length >
                      0 ? (
                        <small>
                          👤{" "}
                          {equipe
                            .map(
                              (
                                item
                              ) =>
                                item.salarie_nom
                            )
                            .filter(Boolean)
                            .join(
                              ", "
                            )}
                        </small>
                      ) : null}

                      {adresseFiche(
                        fiche
                      ) ? (
                        <small>
                          📍{" "}
                          {adresseFiche(
                            fiche
                          )}
                        </small>
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
          className="planning-mobile-floating-add"
          onClick={
            ouvrirNouvelEvenement
          }
        >
          ＋ Ajouter un événement
        </button>
      </div>
    </main>
  );
}