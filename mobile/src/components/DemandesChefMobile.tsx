import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import "./DemandesChefMobile.css";

type Props = {
  entrepriseId: string;

  onFermer: () => void;

  onModification?: () => void;
};

type DecisionChef =
  | "acceptee"
  | "refusee";

type VueDemandes =
  | "actives"
  | "archives";

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
    DecisionChef | null;

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
      "object" &&
    "message" in valeur
  ) {
    const message =
      (
        valeur as {
          message?:
            unknown;
        }
      ).message;

    if (
      typeof message ===
        "string" &&
      message.trim()
    ) {
      return message;
    }
  }

  return fallback;
}

function formatDate(
  date:
    string | null | undefined
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
    string | null | undefined
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
    string | null | undefined
) {
  switch (
    normaliser(
      type
    )
  ) {
    case "conge":
      return "Congé";

    case "materiel":
      return "Matériel";

    case "absence":
      return "Absence";

    case "formation":
      return "Formation";

    case "rendez_vous":
    case "rendez-vous":
      return "Rendez-vous";

    case "indisponibilite":
      return "Indisponibilité";

    case "probleme":
      return "Problème";

    case "divers":
      return "Divers";

    default:
      return "Autre demande";
  }
}

function iconeType(
  type:
    string | null | undefined
) {
  switch (
    normaliser(
      type
    )
  ) {
    case "conge":
      return "🏖️";

    case "materiel":
      return "🧰";

    case "absence":
      return "🚫";

    case "formation":
      return "🎓";

    case "rendez_vous":
    case "rendez-vous":
      return "📅";

    case "indisponibilite":
      return "⛔";

    case "probleme":
      return "⚠️";

    case "divers":
      return "💬";

    default:
      return "📩";
  }
}

function estPlanifiable(
  type:
    string | null | undefined
) {
  return [
    "conge",
    "absence",
    "formation",
    "rendez_vous",
    "rendez-vous",
    "indisponibilite",
  ].includes(
    normaliser(
      type
    )
  );
}

function demandeVerrouillee(
  demande:
    Demande
) {
  return Boolean(
    demande.decision_chef ||
    demande.archivee
  );
}

function libelleDecision(
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
    normaliser(
      demande.statut
    ) ===
    "traitee"
  ) {
    return "Traitée";
  }

  return "En attente";
}

function classeDecision(
  demande:
    Demande
) {
  if (
    demande.decision_chef ===
    "acceptee"
  ) {
    return "accepted";
  }

  if (
    demande.decision_chef ===
    "refusee"
  ) {
    return "refused";
  }

  if (
    normaliser(
      demande.statut
    ) ===
    "traitee"
  ) {
    return "processed";
  }

  return "waiting";
}

function nomDemandeur(
  demande:
    Demande
) {
  return (
    demande.demandeur_nom ||
    demande.demandeur_email ||
    "Salarié"
  );
}

export default function DemandesChefMobile({
  entrepriseId,
  onFermer,
  onModification,
}: Props) {
  const [
    utilisateurId,
    setUtilisateurId,
  ] =
    useState(
      ""
    );

  const [
    demandes,
    setDemandes,
  ] =
    useState<
      Demande[]
    >([]);

  const [
    reponses,
    setReponses,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    vue,
    setVue,
  ] =
    useState<VueDemandes>(
      "actives"
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
    useState(
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
    actionId,
    setActionId,
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
  ]);

  async function initialiser() {
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

      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await supabase
          .auth
          .getUser();

      if (
        userError ||
        !user?.id
      ) {
        throw new Error(
          "Votre session Arboboard a expiré. Reconnectez-vous."
        );
      }

      setUtilisateurId(
        user.id
      );

      await chargerDemandes();
    } catch (
      error
    ) {
      console.error(
        "Initialisation demandes chef mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger les demandes."
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
      !entrepriseId
    ) {
      return;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "demandes"
        )
        .select(
          `
            id,
            entreprise_id,
            demandeur_user_id,
            salarie_id,
            demandeur_nom,
            demandeur_email,
            type_demande,
            titre,
            message,
            statut,
            date_debut,
            date_fin,
            reponse_chef,
            repondu_par,
            repondu_at,
            decision_chef,
            decision_chef_at,
            planning_evenement_id,
            archivee,
            archivee_at,
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
      error
    ) {
      throw error;
    }

    const liste =
      (
        data ||
        []
      ) as Demande[];

    setDemandes(
      liste
    );

    setReponses(
      (
        anciennes
      ) => {
        const suivantes = {
          ...anciennes,
        };

        for (
          const demande
          of liste
        ) {
          if (
            suivantes[
              demande.id
            ] ===
            undefined
          ) {
            suivantes[
              demande.id
            ] =
              demande.reponse_chef ||
              "";
          }
        }

        return suivantes;
      }
    );
  }

  async function actualiser() {
    try {
      setChargement(
        true
      );

      setErreur(
        ""
      );

      await chargerDemandes();
    } catch (
      error
    ) {
      console.error(
        "Actualisation demandes chef mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible d’actualiser les demandes."
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
        const actives =
          demandes.filter(
            (
              demande
            ) =>
              !demandeVerrouillee(
                demande
              )
          ).length;

        const archives =
          demandes.filter(
            demandeVerrouillee
          ).length;

        const acceptees =
          demandes.filter(
            (
              demande
            ) =>
              demande.decision_chef ===
              "acceptee"
          ).length;

        const refusees =
          demandes.filter(
            (
              demande
            ) =>
              demande.decision_chef ===
              "refusee"
          ).length;

        return {
          actives,
          archives,
          acceptees,
          refusees,
        };
      },
      [
        demandes,
      ]
    );

  const typesDisponibles =
    useMemo(
      () => {
        const types =
          new Map<
            string,
            string
          >();

        for (
          const demande
          of demandes
        ) {
          const valeur =
            String(
              demande.type_demande ||
                ""
            ).trim();

          if (
            valeur
          ) {
            types.set(
              valeur,
              libelleType(
                valeur
              )
            );
          }
        }

        return Array.from(
          types.entries()
        ).sort(
          (
            a,
            b
          ) =>
            a[1].localeCompare(
              b[1],
              "fr"
            )
        );
      },
      [
        demandes,
      ]
    );

  const demandesFiltrees =
    useMemo(
      () => {
        const terme =
          normaliser(
            recherche
          );

        return demandes.filter(
          (
            demande
          ) => {
            const archive =
              demandeVerrouillee(
                demande
              );

            if (
              vue ===
                "actives" &&
              archive
            ) {
              return false;
            }

            if (
              vue ===
                "archives" &&
              !archive
            ) {
              return false;
            }

            if (
              filtreType !==
                "tous" &&
              demande.type_demande !==
                filtreType
            ) {
              return false;
            }

            if (
              !terme
            ) {
              return true;
            }

            const contenu =
              normaliser(
                [
                  demande.demandeur_nom,
                  demande.demandeur_email,
                  demande.titre,
                  demande.message,
                  demande.reponse_chef,
                  libelleType(
                    demande.type_demande
                  ),
                  libelleDecision(
                    demande
                  ),
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    " "
                  )
              );

            return contenu.includes(
              terme
            );
          }
        );
      },
      [
        demandes,
        vue,
        recherche,
        filtreType,
      ]
    );

  function modifierReponse(
    demandeId:
      string,
    valeur:
      string
  ) {
    setReponses(
      (
        anciennes
      ) => ({
        ...anciennes,

        [demandeId]:
          valeur,
      })
    );
  }

  async function prendreDecision(
    demande:
      Demande,
    decision:
      DecisionChef
  ) {
    if (
      !entrepriseId ||
      !utilisateurId ||
      actionId
    ) {
      return;
    }

    if (
      demandeVerrouillee(
        demande
      )
    ) {
      setErreur(
        "Cette demande a déjà reçu une décision définitive."
      );

      return;
    }

    const accepter =
      decision ===
      "acceptee";

    const confirmation =
      window.confirm(
        accepter
          ? "Accepter définitivement cette demande ? Elle sera ensuite archivée automatiquement."
          : "Refuser définitivement cette demande ? Elle sera ensuite archivée automatiquement."
      );

    if (
      !confirmation
    ) {
      return;
    }

    try {
      setActionId(
        demande.id
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const maintenant =
        new Date()
          .toISOString();

      const reponse =
        String(
          reponses[
            demande.id
          ] ||
            ""
        ).trim();

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "demandes"
          )
          .update({
            decision_chef:
              decision,

            statut:
              decision,

            reponse_chef:
              reponse ||
              null,

            repondu_par:
              utilisateurId,

            repondu_at:
              maintenant,

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
            "id",
            demande.id
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
            "id, decision_chef, planning_evenement_id"
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
          "Cette demande a déjà été traitée ou son état a changé. Actualisez la liste."
        );
      }

      await chargerDemandes();

      onModification?.();

      const textePlanning =
        accepter &&
        estPlanifiable(
          demande.type_demande
        ) &&
        Boolean(
          demande.date_debut
        )
          ? " Le planning sera synchronisé automatiquement."
          : "";

      setSucces(
        `Demande ${
          accepter
            ? "acceptée"
            : "refusée"
        } et archivée définitivement.${textePlanning}`
      );
    } catch (
      error
    ) {
      console.error(
        "Décision demande chef mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de traiter cette demande."
        )
      );
    } finally {
      setActionId(
        null
      );
    }
  }

  return (
    <main className="demandes-chef-mobile">
      <header className="demandes-chef-mobile-header">
        <button
          type="button"
          className="demandes-chef-mobile-back"
          onClick={
            onFermer
          }
          aria-label="Retour"
        >
          ‹
        </button>

        <div>
          <small>
            ÉQUIPE
          </small>

          <h1>
            Demandes
          </h1>
        </div>

        <button
          type="button"
          className="demandes-chef-mobile-refresh"
          onClick={() =>
            void actualiser()
          }
          disabled={
            chargement
          }
          aria-label="Actualiser"
        >
          ↻
        </button>
      </header>

      <section className="demandes-chef-mobile-content">
        <section className="demandes-chef-mobile-intro">
          <small>
            DEMANDES SALARIÉS
          </small>

          <h2>
            À valider
          </h2>

          <p>
            Congés, rendez-vous, absences et autres demandes de votre équipe.
          </p>
        </section>

        {erreur ? (
          <div
            className="demandes-chef-mobile-error"
            role="alert"
          >
            {erreur}
          </div>
        ) : null}

        {succes ? (
          <div
            className="demandes-chef-mobile-success"
            role="status"
          >
            {succes}
          </div>
        ) : null}

        <section className="demandes-chef-mobile-stats">
          <article>
            <small>
              À TRAITER
            </small>

            <strong>
              {statistiques.actives}
            </strong>
          </article>

          <article>
            <small>
              ACCEPTÉES
            </small>

            <strong>
              {statistiques.acceptees}
            </strong>
          </article>

          <article>
            <small>
              ARCHIVES
            </small>

            <strong>
              {statistiques.archives}
            </strong>
          </article>
        </section>

        <div className="demandes-chef-mobile-tabs">
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
            À traiter

            <span>
              {statistiques.actives}
            </span>
          </button>

          <button
            type="button"
            className={
              vue ===
              "archives"
                ? "active"
                : ""
            }
            onClick={() =>
              setVue(
                "archives"
              )
            }
          >
            Archives

            <span>
              {statistiques.archives}
            </span>
          </button>
        </div>

        <label className="demandes-chef-mobile-search">
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
            placeholder="Salarié, motif, demande..."
          />
        </label>

        {typesDisponibles.length >
        0 ? (
          <div className="demandes-chef-mobile-types">
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
              Toutes
            </button>

            {typesDisponibles.map(
              ([
                valeur,
                libelle,
              ]) => (
                <button
                  type="button"
                  key={
                    valeur
                  }
                  className={
                    filtreType ===
                    valeur
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFiltreType(
                      valeur
                    )
                  }
                >
                  {
                    iconeType(
                      valeur
                    )
                  }{" "}
                  {libelle}
                </button>
              )
            )}
          </div>
        ) : null}

        {chargement ? (
          <section className="demandes-chef-mobile-loading">
            <div className="demandes-chef-mobile-spinner" />

            <strong>
              Chargement des demandes…
            </strong>
          </section>
        ) : demandesFiltrees.length ===
          0 ? (
          <section className="demandes-chef-mobile-empty">
            <span>
              ✓
            </span>

            <h3>
              {vue ===
              "actives"
                ? "Aucune demande à traiter"
                : "Aucune demande archivée"}
            </h3>

            <p>
              {vue ===
              "actives"
                ? "Toutes les demandes de l’équipe sont à jour."
                : "Les demandes traitées apparaîtront ici."}
            </p>
          </section>
        ) : (
          <div className="demandes-chef-mobile-list">
            {demandesFiltrees.map(
              (
                demande
              ) => {
                const verrouillee =
                  demandeVerrouillee(
                    demande
                  );

                const enCours =
                  actionId ===
                  demande.id;

                return (
                  <article
                    key={
                      demande.id
                    }
                    className="demandes-chef-mobile-card"
                  >
                    <div className="demandes-chef-mobile-card-head">
                      <div className="demandes-chef-mobile-type-icon">
                        {iconeType(
                          demande.type_demande
                        )}
                      </div>

                      <div className="demandes-chef-mobile-card-title">
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

                        <p>
                          {nomDemandeur(
                            demande
                          )}
                        </p>
                      </div>

                      <span
                        className={`demandes-chef-mobile-status ${classeDecision(
                          demande
                        )}`}
                      >
                        {libelleDecision(
                          demande
                        )}
                      </span>
                    </div>

                    {demande.date_debut ? (
                      <div className="demandes-chef-mobile-dates">
                        <div>
                          <small>
                            DU
                          </small>

                          <strong>
                            {formatDate(
                              demande.date_debut
                            )}
                          </strong>
                        </div>

                        <div>
                          <small>
                            AU
                          </small>

                          <strong>
                            {formatDate(
                              demande.date_fin ||
                                demande.date_debut
                            )}
                          </strong>
                        </div>
                      </div>
                    ) : null}

                    {demande.message ? (
                      <div className="demandes-chef-mobile-message">
                        <small>
                          MOTIF / MESSAGE
                        </small>

                        <p>
                          {demande.message}
                        </p>
                      </div>
                    ) : null}

                    {!verrouillee ? (
                      <>
                        <label className="demandes-chef-mobile-response">
                          <span>
                            Réponse au salarié
                          </span>

                          <textarea
                            rows={3}
                            value={
                              reponses[
                                demande.id
                              ] ||
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              modifierReponse(
                                demande.id,
                                event.target.value
                              )
                            }
                            placeholder="Facultatif : ajoutez un commentaire..."
                            disabled={
                              enCours
                            }
                          />
                        </label>

                        {estPlanifiable(
                          demande.type_demande
                        ) &&
                        demande.date_debut ? (
                          <div className="demandes-chef-mobile-planning-info">
                            <span>
                              📅
                            </span>

                            <p>
                              Si vous acceptez cette demande, elle sera automatiquement ajoutée au planning.
                            </p>
                          </div>
                        ) : null}

                        <div className="demandes-chef-mobile-actions">
                          <button
                            type="button"
                            className="refuse"
                            disabled={
                              actionId !==
                              null
                            }
                            onClick={() =>
                              void prendreDecision(
                                demande,
                                "refusee"
                              )
                            }
                          >
                            {enCours
                              ? "Traitement…"
                              : "Refuser"}
                          </button>

                          <button
                            type="button"
                            className="accept"
                            disabled={
                              actionId !==
                              null
                            }
                            onClick={() =>
                              void prendreDecision(
                                demande,
                                "acceptee"
                              )
                            }
                          >
                            {enCours
                              ? "Traitement…"
                              : "Accepter"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="demandes-chef-mobile-archived">
                        <div>
                          <small>
                            DÉCISION
                          </small>

                          <strong>
                            {libelleDecision(
                              demande
                            )}
                          </strong>
                        </div>

                        <div>
                          <small>
                            TRAITÉE LE
                          </small>

                          <strong>
                            {formatDateHeure(
                              demande.decision_chef_at ||
                                demande.repondu_at ||
                                demande.archivee_at
                            )}
                          </strong>
                        </div>

                        {demande.reponse_chef ? (
                          <p>
                            {demande.reponse_chef}
                          </p>
                        ) : null}

                        {demande.planning_evenement_id ? (
                          <span className="demandes-chef-mobile-planning-linked">
                            ✓ Ajoutée au planning
                          </span>
                        ) : null}
                      </div>
                    )}

                    <footer className="demandes-chef-mobile-card-footer">
                      <span>
                        Envoyée le{" "}
                        {formatDateHeure(
                          demande.created_at
                        )}
                      </span>

                      {demande.demandeur_email ? (
                        <a
                          href={`mailto:${demande.demandeur_email}`}
                        >
                          ✉ Contacter
                        </a>
                      ) : null}
                    </footer>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}