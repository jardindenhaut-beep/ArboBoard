import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import "./DemandesSalarieMobile.css";

type Props = {
  entrepriseId: string;

  profilId: string;

  salarieId: string;

  prenom?:
    string | null;

  email?:
    string | null;

  onFermer:
    () => void;
};

type TypeDemande =
  | "conge"
  | "rendez_vous"
  | "autre";

type VueDemandes =
  | "actives"
  | "historique";

type Salarie = {
  id: string;

  entreprise_id:
    string;

  nom:
    string | null;

  prenom:
    string | null;

  email:
    string | null;

  statut:
    string | null;
};

type Demande = {
  id: string;

  entreprise_id:
    string;

  demandeur_user_id:
    string | null;

  salarie_id:
    string | null;

  demandeur_nom:
    string | null;

  demandeur_email:
    string | null;

  type_demande:
    string | null;

  titre:
    string | null;

  message:
    string | null;

  statut:
    string | null;

  date_debut:
    string | null;

  date_fin:
    string | null;

  reponse_chef:
    string | null;

  repondu_par:
    string | null;

  repondu_at:
    string | null;

  decision_chef:
    "acceptee" | "refusee" | null;

  decision_chef_at:
    string | null;

  planning_evenement_id:
    string | null;

  archivee:
    boolean | null;

  archivee_at:
    string | null;

  created_at:
    string | null;

  updated_at:
    string | null;
};

type Formulaire = {
  type_demande:
    TypeDemande;

  titre:
    string;

  message:
    string;

  date_debut:
    string;

  date_fin:
    string;
};

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

function formulaireVide(): Formulaire {
  const aujourdHui =
    aujourdHuiIso();

  return {
    type_demande:
      "conge",

    titre:
      "",

    message:
      "",

    date_debut:
      aujourdHui,

    date_fin:
      aujourdHui,
  };
}

function messageErreur(
  error: unknown,
  fallback: string
) {
  if (
    error instanceof
      Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error ===
      "object" &&
    "message" in error &&
    typeof (
      error as {
        message?:
          unknown;
      }
    ).message ===
      "string"
  ) {
    return (
      error as {
        message:
          string;
      }
    ).message;
  }

  return fallback;
}

function formatDate(
  date:
    | string
    | null
    | undefined
) {
  if (
    !date
  ) {
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

function formatDateHeure(
  date:
    | string
    | null
    | undefined
) {
  if (
    !date
  ) {
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

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      new Date(
        date
      )
    );
  } catch {
    return date;
  }
}

function libelleType(
  type:
    | string
    | null
    | undefined
) {
  if (
    type ===
    "conge"
  ) {
    return "Congé";
  }

  if (
    type ===
      "rendez_vous" ||
    type ===
      "rendez-vous"
  ) {
    return "Rendez-vous";
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
    "materiel"
  ) {
    return "Matériel";
  }

  if (
    type ===
    "probleme"
  ) {
    return "Problème";
  }

  if (
    type ===
    "indisponibilite"
  ) {
    return "Indisponibilité";
  }

  return "Divers";
}

function iconeType(
  type:
    | string
    | null
    | undefined
) {
  if (
    type ===
    "conge"
  ) {
    return "🏖️";
  }

  if (
    type ===
      "rendez_vous" ||
    type ===
      "rendez-vous"
  ) {
    return "📅";
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
    "materiel"
  ) {
    return "🧰";
  }

  if (
    type ===
    "probleme"
  ) {
    return "⚠️";
  }

  if (
    type ===
    "indisponibilite"
  ) {
    return "⛔";
  }

  return "💬";
}

function libelleStatut(
  demande:
    Demande
) {
  if (
    demande.decision_chef ===
    "acceptee"
  ) {
    return "Acceptée";
  }

  if (
    demande.decision_chef ===
    "refusee"
  ) {
    return "Refusée";
  }

  if (
    demande.statut ===
      "annulee" ||
    demande.statut ===
      "annule"
  ) {
    return "Annulée";
  }

  if (
    demande.statut ===
    "traitee"
  ) {
    return "Traitée";
  }

  return "En attente";
}

function classeStatut(
  demande:
    Demande
) {
  if (
    demande.decision_chef ===
    "acceptee"
  ) {
    return "demandes-mobile-status demandes-mobile-status-success";
  }

  if (
    demande.decision_chef ===
    "refusee"
  ) {
    return "demandes-mobile-status demandes-mobile-status-danger";
  }

  if (
    demande.statut ===
      "annulee" ||
    demande.statut ===
      "annule"
  ) {
    return "demandes-mobile-status demandes-mobile-status-neutral";
  }

  if (
    demande.statut ===
    "traitee"
  ) {
    return "demandes-mobile-status demandes-mobile-status-info";
  }

  return "demandes-mobile-status demandes-mobile-status-waiting";
}

function estHistorique(
  demande:
    Demande
) {
  return Boolean(
    demande.archivee ||
      demande.decision_chef ||
      demande.statut ===
        "annulee" ||
      demande.statut ===
        "annule"
  );
}

function peutAnnuler(
  demande:
    Demande
) {
  return (
    !demande.archivee &&
    !demande.decision_chef &&
    demande.statut ===
      "en_attente"
  );
}

function titreAutomatique(
  type:
    TypeDemande
) {
  if (
    type ===
    "conge"
  ) {
    return "Demande de congé";
  }

  if (
    type ===
    "rendez_vous"
  ) {
    return "Demande de rendez-vous";
  }

  return "Demande diverse";
}

export default function DemandesSalarieMobile({
  entrepriseId,
  profilId,
  salarieId,
  prenom,
  email,
  onFermer,
}: Props) {
  const [
    salarie,
    setSalarie,
  ] =
    useState<Salarie | null>(
      null
    );

  const [
    demandes,
    setDemandes,
  ] =
    useState<
      Demande[]
    >([]);

  const [
    vue,
    setVue,
  ] =
    useState<VueDemandes>(
      "actives"
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
    useState<Formulaire>(
      formulaireVide()
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
    annulationId,
    setAnnulationId,
  ] =
    useState<
      string | null
    >(
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

  useEffect(() => {
    void initialiser();
  }, [
    entrepriseId,
    profilId,
    salarieId,
  ]);

  useEffect(() => {
    if (
      !entrepriseId ||
      !salarieId
    ) {
      return;
    }

    let timer:
      ReturnType<typeof setTimeout> | null =
      null;

    const canal =
      supabase
        .channel(
          `demandes-salarie-${salarieId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",

            schema:
              "public",

            table:
              "demandes",

            filter:
              `entreprise_id=eq.${entrepriseId}`,
          },
          () => {
            if (
              timer
            ) {
              clearTimeout(
                timer
              );
            }

            timer =
              setTimeout(
                () => {
                  void chargerDemandes();
                },
                250
              );
          }
        )
        .subscribe();

    return () => {
      if (
        timer
      ) {
        clearTimeout(
          timer
        );
      }

      void supabase.removeChannel(
        canal
      );
    };
  }, [
    entrepriseId,
    salarieId,
  ]);

  async function initialiser() {
    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      const {
        data:
          salarieData,
        error:
          salarieError,
      } =
        await supabase
          .from(
            "salaries"
          )
          .select(
            `
              id,
              entreprise_id,
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
          .eq(
            "id",
            salarieId
          )
          .maybeSingle();

      if (
        salarieError
      ) {
        throw salarieError;
      }

      if (
        !salarieData
      ) {
        throw new Error(
          "Fiche salarié introuvable."
        );
      }

      setSalarie(
        salarieData as Salarie
      );

      await chargerDemandes();
    } catch (
      error
    ) {
      console.error(
        "Initialisation demandes salarié mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger vos demandes."
        )
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  async function chargerDemandes() {
    if (
      !entrepriseId ||
      !salarieId
    ) {
      setDemandes(
        []
      );

      return;
    }

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "demandes"
          )
          .select(
            "*"
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "salarie_id",
            salarieId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      if (
        error
      ) {
        throw error;
      }

      setDemandes(
        (
          data ||
          []
        ) as Demande[]
      );
    } catch (
      error
    ) {
      console.error(
        "Chargement demandes salarié mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger vos demandes."
        )
      );
    }
  }

  const demandesActives =
    useMemo(
      () =>
        demandes.filter(
          (
            demande
          ) =>
            !estHistorique(
              demande
            )
        ),
      [
        demandes,
      ]
    );

  const demandesHistorique =
    useMemo(
      () =>
        demandes.filter(
          (
            demande
          ) =>
            estHistorique(
              demande
            )
        ),
      [
        demandes,
      ]
    );

  const demandesAffichees =
    vue ===
    "actives"
      ? demandesActives
      : demandesHistorique;

  const statistiques =
    useMemo(
      () => ({
        attente:
          demandes.filter(
            (
              demande
            ) =>
              demande.statut ===
                "en_attente" &&
              !demande.decision_chef &&
              !demande.archivee
          ).length,

        acceptees:
          demandes.filter(
            (
              demande
            ) =>
              demande.decision_chef ===
              "acceptee"
          ).length,

        refusees:
          demandes.filter(
            (
              demande
            ) =>
              demande.decision_chef ===
              "refusee"
          ).length,
      }),
      [
        demandes,
      ]
    );

  function ouvrirCreation(
    type?:
      TypeDemande
  ) {
    const nouveau =
      formulaireVide();

    if (
      type
    ) {
      nouveau.type_demande =
        type;

      nouveau.titre =
        titreAutomatique(
          type
        );
    }

    setFormulaire(
      nouveau
    );

    setErreur(
      ""
    );

    setSucces(
      ""
    );

    setFormulaireOuvert(
      true
    );

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }

  function fermerCreation() {
    if (
      enregistrement
    ) {
      return;
    }

    setFormulaireOuvert(
      false
    );

    setFormulaire(
      formulaireVide()
    );

    setErreur(
      ""
    );
  }

  function modifierType(
    type:
      TypeDemande
  ) {
    setFormulaire(
      (
        ancien
      ) => {
        const ancienTitreAuto =
          [
            titreAutomatique(
              "conge"
            ),
            titreAutomatique(
              "rendez_vous"
            ),
            titreAutomatique(
              "autre"
            ),
          ].includes(
            ancien.titre
          );

        return {
          ...ancien,

          type_demande:
            type,

          titre:
            !ancien.titre.trim() ||
            ancienTitreAuto
              ? titreAutomatique(
                  type
                )
              : ancien.titre,
        };
      }
    );
  }

  function nomDemandeur() {
    const nom =
      `${salarie?.prenom || prenom || ""} ${
        salarie?.nom || ""
      }`.trim();

    return (
      nom ||
      salarie?.email ||
      email ||
      "Salarié"
    );
  }

  async function creerDemande() {
    if (
      enregistrement
    ) {
      return;
    }

    if (
      !entrepriseId ||
      !profilId ||
      !salarieId
    ) {
      setErreur(
        "Votre compte salarié n’est pas correctement associé."
      );

      return;
    }

    if (
      !formulaire.date_debut
    ) {
      setErreur(
        "Choisissez une date de début."
      );

      return;
    }

    if (
      formulaire.date_fin &&
      formulaire.date_fin <
        formulaire.date_debut
    ) {
      setErreur(
        "La date de fin ne peut pas être avant la date de début."
      );

      return;
    }

    if (
      !formulaire.message.trim()
    ) {
      setErreur(
        "Expliquez votre demande avant de l’envoyer."
      );

      return;
    }

    const titre =
      formulaire.titre.trim() ||
      titreAutomatique(
        formulaire.type_demande
      );

    try {
      setEnregistrement(
        true
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const maintenant =
        new Date().toISOString();

      const {
        error,
      } =
        await supabase
          .from(
            "demandes"
          )
          .insert({
            entreprise_id:
              entrepriseId,

            demandeur_user_id:
              profilId,

            salarie_id:
              salarieId,

            demandeur_nom:
              nomDemandeur(),

            demandeur_email:
              (
                salarie?.email ||
                email ||
                ""
              )
                .trim()
                .toLowerCase() ||
              null,

            type_demande:
              formulaire.type_demande,

            titre,

            message:
              formulaire.message.trim(),

            statut:
              "en_attente",

            date_debut:
              formulaire.date_debut,

            date_fin:
              formulaire.date_fin ||
              formulaire.date_debut,

            reponse_chef:
              null,

            repondu_par:
              null,

            repondu_at:
              null,

            decision_chef:
              null,

            decision_chef_at:
              null,

            planning_evenement_id:
              null,

            archivee:
              false,

            archivee_at:
              null,

            updated_at:
              maintenant,
          });

      if (
        error
      ) {
        throw error;
      }

      await chargerDemandes();

      setFormulaireOuvert(
        false
      );

      setFormulaire(
        formulaireVide()
      );

      setVue(
        "actives"
      );

      setSucces(
        "Votre demande a été envoyée au Chef."
      );

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });
    } catch (
      error
    ) {
      console.error(
        "Création demande salarié mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de créer votre demande pour le moment."
        )
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  async function annulerDemande(
    demande:
      Demande
  ) {
    if (
      annulationId
    ) {
      return;
    }

    if (
      !peutAnnuler(
        demande
      )
    ) {
      setErreur(
        "Cette demande ne peut plus être annulée."
      );

      await chargerDemandes();

      return;
    }

    const confirmation =
      window.confirm(
        "Annuler cette demande ? Le Chef ne pourra plus l’accepter."
      );

    if (
      !confirmation
    ) {
      return;
    }

    try {
      setAnnulationId(
        demande.id
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const maintenant =
        new Date().toISOString();

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "demandes"
          )
          .update({
            statut:
              "annulee",

            archivee:
              true,

            archivee_at:
              maintenant,

            updated_at:
              maintenant,
          })
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .eq(
            "salarie_id",
            salarieId
          )
          .eq(
            "id",
            demande.id
          )
          .eq(
            "statut",
            "en_attente"
          )
          .is(
            "decision_chef",
            null
          )
          .eq(
            "archivee",
            false
          )
          .select(
            "id"
          )
          .maybeSingle();

      if (
        error
      ) {
        throw error;
      }

      if (
        !data
      ) {
        throw new Error(
          "La demande a déjà été traitée ou son état a changé."
        );
      }

      await chargerDemandes();

      setSucces(
        "Votre demande a été annulée."
      );
    } catch (
      error
    ) {
      console.error(
        "Annulation demande salarié mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible d’annuler cette demande."
        )
      );
    } finally {
      setAnnulationId(
        null
      );
    }
  }

  if (
    formulaireOuvert
  ) {
    return (
      <main className="demandes-mobile">
        <header className="demandes-mobile-header">
          <button
            type="button"
            className="demandes-mobile-back"
            onClick={
              fermerCreation
            }
          >
            ‹
          </button>

          <div>
            <h1>
              Nouvelle demande
            </h1>

            <span>
              Espace Salarié
            </span>
          </div>

          <div className="demandes-mobile-header-space" />
        </header>

        <div className="demandes-mobile-content">
          {erreur ? (
            <div className="demandes-mobile-error">
              {erreur}
            </div>
          ) : null}

          <section className="demandes-mobile-form-intro">
            <span>
              📩
            </span>

            <div>
              <small>
                DEMANDE AU CHEF
              </small>

              <h2>
                Que souhaitez-vous demander ?
              </h2>

              <p>
                Votre demande sera transmise directement dans Arboboard.
              </p>
            </div>
          </section>

          <section className="demandes-mobile-card">
            <div className="demandes-mobile-card-title">
              <span>
                1
              </span>

              <div>
                <h3>
                  Type de demande
                </h3>

                <p>
                  Choisissez la catégorie qui correspond.
                </p>
              </div>
            </div>

            <div className="demandes-mobile-types">
              <button
                type="button"
                className={
                  formulaire.type_demande ===
                  "conge"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  modifierType(
                    "conge"
                  )
                }
              >
                <span>
                  🏖️
                </span>

                <strong>
                  Congé
                </strong>

                <small>
                  Jour ou période d’absence
                </small>
              </button>

              <button
                type="button"
                className={
                  formulaire.type_demande ===
                  "rendez_vous"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  modifierType(
                    "rendez_vous"
                  )
                }
              >
                <span>
                  📅
                </span>

                <strong>
                  Rendez-vous
                </strong>

                <small>
                  Rendez-vous personnel
                </small>
              </button>

              <button
                type="button"
                className={
                  formulaire.type_demande ===
                  "autre"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  modifierType(
                    "autre"
                  )
                }
              >
                <span>
                  💬
                </span>

                <strong>
                  Divers
                </strong>

                <small>
                  Autre demande
                </small>
              </button>
            </div>
          </section>

          <section className="demandes-mobile-card">
            <div className="demandes-mobile-card-title">
              <span>
                2
              </span>

              <div>
                <h3>
                  Date
                </h3>

                <p>
                  Indiquez le jour ou la période concernée.
                </p>
              </div>
            </div>

            <div className="demandes-mobile-date-grid">
              <label className="demandes-mobile-field">
                <span>
                  Du *
                </span>

                <input
                  type="date"
                  value={
                    formulaire.date_debut
                  }
                  onChange={(
                    event
                  ) =>
                    setFormulaire(
                      (
                        ancien
                      ) => {
                        const nouvelleDate =
                          event.target.value;

                        return {
                          ...ancien,

                          date_debut:
                            nouvelleDate,

                          date_fin:
                            !ancien.date_fin ||
                            ancien.date_fin <
                              nouvelleDate
                              ? nouvelleDate
                              : ancien.date_fin,
                        };
                      }
                    )
                  }
                />
              </label>

              <label className="demandes-mobile-field">
                <span>
                  Au
                </span>

                <input
                  type="date"
                  min={
                    formulaire.date_debut
                  }
                  value={
                    formulaire.date_fin
                  }
                  onChange={(
                    event
                  ) =>
                    setFormulaire(
                      (
                        ancien
                      ) => ({
                        ...ancien,

                        date_fin:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>
            </div>

            {formulaire.date_debut &&
            formulaire.date_fin &&
            formulaire.date_debut ===
              formulaire.date_fin ? (
              <div className="demandes-mobile-date-info">
                📅 Demande pour le{" "}
                <strong>
                  {formatDate(
                    formulaire.date_debut
                  )}
                </strong>
              </div>
            ) : formulaire.date_debut &&
              formulaire.date_fin ? (
              <div className="demandes-mobile-date-info">
                📅 Du{" "}
                <strong>
                  {formatDate(
                    formulaire.date_debut
                  )}
                </strong>{" "}
                au{" "}
                <strong>
                  {formatDate(
                    formulaire.date_fin
                  )}
                </strong>
              </div>
            ) : null}
          </section>

          <section className="demandes-mobile-card">
            <div className="demandes-mobile-card-title">
              <span>
                3
              </span>

              <div>
                <h3>
                  Motif
                </h3>

                <p>
                  Expliquez simplement votre demande.
                </p>
              </div>
            </div>

            <label className="demandes-mobile-field">
              <span>
                Titre
              </span>

              <input
                type="text"
                value={
                  formulaire.titre
                }
                onChange={(
                  event
                ) =>
                  setFormulaire(
                    (
                      ancien
                    ) => ({
                      ...ancien,

                      titre:
                        event.target.value,
                    })
                  )
                }
                placeholder={
                  titreAutomatique(
                    formulaire.type_demande
                  )
                }
              />
            </label>

            <label className="demandes-mobile-field">
              <span>
                Votre message *
              </span>

              <textarea
                rows={
                  6
                }
                value={
                  formulaire.message
                }
                onChange={(
                  event
                ) =>
                  setFormulaire(
                    (
                      ancien
                    ) => ({
                      ...ancien,

                      message:
                        event.target.value,
                    })
                  )
                }
                placeholder={
                  formulaire.type_demande ===
                  "conge"
                    ? "Ex : Je souhaite poser ces jours de congé..."
                    : formulaire.type_demande ===
                        "rendez_vous"
                      ? "Ex : J’ai un rendez-vous personnel à cette date..."
                      : "Expliquez votre demande..."
                }
              />

              <small className="demandes-mobile-counter">
                {
                  formulaire.message.trim()
                    .length
                }{" "}
                caractère
                {formulaire.message.trim()
                  .length >
                1
                  ? "s"
                  : ""}
              </small>
            </label>
          </section>

          <section className="demandes-mobile-recap">
            <div className="demandes-mobile-recap-icon">
              {iconeType(
                formulaire.type_demande
              )}
            </div>

            <div>
              <small>
                RÉCAPITULATIF
              </small>

              <strong>
                {libelleType(
                  formulaire.type_demande
                )}
              </strong>

              <span>
                {formatDate(
                  formulaire.date_debut
                )}

                {formulaire.date_fin &&
                formulaire.date_fin !==
                  formulaire.date_debut
                  ? ` → ${formatDate(
                      formulaire.date_fin
                    )}`
                  : ""}
              </span>
            </div>
          </section>

          <div className="demandes-mobile-form-actions">
            <button
              type="button"
              className="demandes-mobile-primary"
              disabled={
                enregistrement
              }
              onClick={() =>
                void creerDemande()
              }
            >
              {enregistrement
                ? "Envoi de la demande…"
                : "✓ Envoyer au Chef"}
            </button>

            <button
              type="button"
              className="demandes-mobile-secondary"
              disabled={
                enregistrement
              }
              onClick={
                fermerCreation
              }
            >
              Annuler
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="demandes-mobile">
      <header className="demandes-mobile-header">
        <button
          type="button"
          className="demandes-mobile-back"
          onClick={
            onFermer
          }
        >
          ‹
        </button>

        <div>
          <h1>
            Mes demandes
          </h1>

          <span>
            Espace Salarié
          </span>
        </div>

        <button
          type="button"
          className="demandes-mobile-add-header"
          onClick={() =>
            ouvrirCreation()
          }
        >
          ＋
        </button>
      </header>

      <div className="demandes-mobile-content">
        {erreur ? (
          <div className="demandes-mobile-error">
            {erreur}

            <button
              type="button"
              onClick={() =>
                void chargerDemandes()
              }
            >
              Réessayer
            </button>
          </div>
        ) : null}

        {succes ? (
          <div className="demandes-mobile-success">
            {succes}
          </div>
        ) : null}

        <section className="demandes-mobile-hero">
          <div>
            <small>
              MES DEMANDES
            </small>

            <h2>
              Besoin de prévenir le Chef ?
            </h2>

            <p>
              Congé, rendez-vous ou autre demande : envoyez-la directement depuis votre téléphone.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              ouvrirCreation()
            }
          >
            ＋ Nouvelle demande
          </button>
        </section>

        <section className="demandes-mobile-quick">
          <button
            type="button"
            onClick={() =>
              ouvrirCreation(
                "conge"
              )
            }
          >
            <span>
              🏖️
            </span>

            <strong>
              Congé
            </strong>
          </button>

          <button
            type="button"
            onClick={() =>
              ouvrirCreation(
                "rendez_vous"
              )
            }
          >
            <span>
              📅
            </span>

            <strong>
              Rendez-vous
            </strong>
          </button>

          <button
            type="button"
            onClick={() =>
              ouvrirCreation(
                "autre"
              )
            }
          >
            <span>
              💬
            </span>

            <strong>
              Divers
            </strong>
          </button>
        </section>

        <section className="demandes-mobile-stats">
          <div>
            <strong>
              {
                statistiques.attente
              }
            </strong>

            <span>
              En attente
            </span>
          </div>

          <div>
            <strong>
              {
                statistiques.acceptees
              }
            </strong>

            <span>
              Acceptées
            </span>
          </div>

          <div>
            <strong>
              {
                statistiques.refusees
              }
            </strong>

            <span>
              Refusées
            </span>
          </div>
        </section>

        <div className="demandes-mobile-tabs">
          <button
            type="button"
            className={
              vue ===
              "actives"
                ? "active"
                : ""
            }
            onClick={() =>
              setVue(
                "actives"
              )
            }
          >
            En cours

            <span>
              {
                demandesActives.length
              }
            </span>
          </button>

          <button
            type="button"
            className={
              vue ===
              "historique"
                ? "active"
                : ""
            }
            onClick={() =>
              setVue(
                "historique"
              )
            }
          >
            Historique

            <span>
              {
                demandesHistorique.length
              }
            </span>
          </button>
        </div>

        {chargement ? (
          <div className="demandes-mobile-loading">
            <div className="demandes-mobile-spinner" />

            <strong>
              Chargement de vos demandes…
            </strong>
          </div>
        ) : demandesAffichees.length ===
          0 ? (
          <div className="demandes-mobile-empty">
            <span>
              {vue ===
              "actives"
                ? "📭"
                : "🗂️"}
            </span>

            <strong>
              {vue ===
              "actives"
                ? "Aucune demande en attente"
                : "Aucun historique"}
            </strong>

            <p>
              {vue ===
              "actives"
                ? "Vos nouvelles demandes apparaîtront ici jusqu’à la décision du Chef."
                : "Les demandes acceptées, refusées ou annulées apparaîtront ici."}
            </p>

            {vue ===
            "actives" ? (
              <button
                type="button"
                onClick={() =>
                  ouvrirCreation()
                }
              >
                ＋ Faire une demande
              </button>
            ) : null}
          </div>
        ) : (
          <div className="demandes-mobile-list">
            {demandesAffichees.map(
              (
                demande
              ) => (
                <article
                  className="demandes-mobile-item"
                  key={
                    demande.id
                  }
                >
                  <div className="demandes-mobile-item-top">
                    <div className="demandes-mobile-item-icon">
                      {iconeType(
                        demande.type_demande
                      )}
                    </div>

                    <div className="demandes-mobile-item-title">
                      <small>
                        {libelleType(
                          demande.type_demande
                        )}
                      </small>

                      <h3>
                        {demande.titre ||
                          libelleType(
                            demande.type_demande
                          )}
                      </h3>
                    </div>

                    <span
                      className={classeStatut(
                        demande
                      )}
                    >
                      {libelleStatut(
                        demande
                      )}
                    </span>
                  </div>

                  <div className="demandes-mobile-item-date">
                    <span>
                      📅
                    </span>

                    <strong>
                      {formatDate(
                        demande.date_debut
                      )}

                      {demande.date_fin &&
                      demande.date_fin !==
                        demande.date_debut
                        ? ` → ${formatDate(
                            demande.date_fin
                          )}`
                        : ""}
                    </strong>
                  </div>

                  {demande.message ? (
                    <p className="demandes-mobile-item-message">
                      {
                        demande.message
                      }
                    </p>
                  ) : null}

                  {demande.reponse_chef ? (
                    <div className="demandes-mobile-response">
                      <div>
                        <span>
                          👤
                        </span>

                        <strong>
                          Réponse du Chef
                        </strong>
                      </div>

                      <p>
                        {
                          demande.reponse_chef
                        }
                      </p>

                      {demande.repondu_at ||
                      demande.decision_chef_at ? (
                        <small>
                          {formatDateHeure(
                            demande.repondu_at ||
                              demande.decision_chef_at
                          )}
                        </small>
                      ) : null}
                    </div>
                  ) : null}

                  {demande.decision_chef ===
                    "acceptee" &&
                  demande.planning_evenement_id ? (
                    <div className="demandes-mobile-planning">
                      ✓ Cette demande a été ajoutée automatiquement au planning.
                    </div>
                  ) : null}

                  <div className="demandes-mobile-item-footer">
                    <small>
                      Envoyée le{" "}
                      {formatDateHeure(
                        demande.created_at
                      )}
                    </small>

                    {peutAnnuler(
                      demande
                    ) ? (
                      <button
                        type="button"
                        disabled={
                          annulationId !==
                          null
                        }
                        onClick={() =>
                          void annulerDemande(
                            demande
                          )
                        }
                      >
                        {annulationId ===
                        demande.id
                          ? "Annulation…"
                          : "Annuler la demande"}
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}