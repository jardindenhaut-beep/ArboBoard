import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import "./SalariesMobile.css";

type Props = {
  entrepriseId: string;

  onFermer: () => void;

  onModification?: () => void;
};

type Salarie = {
  id: string;

  entreprise_id: string;

  nom:
    string | null;

  prenom:
    string | null;

  telephone:
    string | null;

  email:
    string | null;

  poste:
    string | null;

  type_contrat:
    string | null;

  date_entree:
    string | null;

  statut:
    string | null;

  notes:
    string | null;

  salaire_brut?:
    number | null;

  user_id?:
    string | null;

  profil_id?:
    string | null;

  created_at?:
    string | null;

  updated_at?:
    string | null;
};

type FormulaireSalarie = {
  id:
    string | null;

  prenom:
    string;

  nom:
    string;

  telephone:
    string;

  email:
    string;

  poste:
    string;

  type_contrat:
    string;

  date_entree:
    string;

  statut:
    string;

  notes:
    string;
};

type Filtre =
  | "tous"
  | "actifs"
  | "inactifs";

const FORMULAIRE_VIDE:
  FormulaireSalarie = {
  id:
    null,

  prenom:
    "",

  nom:
    "",

  telephone:
    "",

  email:
    "",

  poste:
    "",

  type_contrat:
    "CDI",

  date_entree:
    "",

  statut:
    "Actif",

  notes:
    "",
};

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

function valeurNullable(
  valeur:
    string
) {
  const nettoyee =
    valeur.trim();

  return nettoyee
    ? nettoyee
    : null;
}

function nomComplet(
  salarie:
    Salarie
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

function initiales(
  salarie:
    Salarie
) {
  const prenom =
    salarie.prenom
      ?.trim()
      .charAt(0)
      .toUpperCase() ||
    "";

  const nom =
    salarie.nom
      ?.trim()
      .charAt(0)
      .toUpperCase() ||
    "";

  return (
    `${prenom}${nom}` ||
    "S"
  );
}

function estActif(
  salarie:
    Salarie
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

function accesLie(
  salarie:
    Salarie
) {
  return Boolean(
    salarie.user_id ||
    salarie.profil_id
  );
}

function formatDate(
  valeur:
    string | null | undefined
) {
  if (
    !valeur
  ) {
    return "Non renseignée";
  }

  try {
    const date =
      new Date(
        `${valeur.slice(
          0,
          10
        )}T12:00:00`
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

export default function SalariesMobile({
  entrepriseId,
  onFermer,
  onModification,
}: Props) {
  const [
    salaries,
    setSalaries,
  ] =
    useState<
      Salarie[]
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
    enregistrement,
    setEnregistrement,
  ] =
    useState(
      false
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
    invitationId,
    setInvitationId,
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
    useState<FormulaireSalarie>(
      FORMULAIRE_VIDE
    );

  useEffect(() => {
    void chargerSalaries();
  }, [
    entrepriseId,
  ]);

  async function chargerSalaries() {
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
              entreprise_id,
              nom,
              prenom,
              telephone,
              email,
              poste,
              type_contrat,
              date_entree,
              statut,
              notes,
              salaire_brut,
              user_id,
              profil_id,
              created_at,
              updated_at
            `
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .order(
            "prenom",
            {
              ascending:
                true,
            }
          )
          .order(
            "nom",
            {
              ascending:
                true,
            }
          );

      if (
        error
      ) {
        throw error;
      }

      setSalaries(
        (
          data ||
          []
        ) as Salarie[]
      );
    } catch (
      error
    ) {
      console.error(
        "Chargement salariés mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger les salariés."
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
        const actifs =
          salaries.filter(
            estActif
          ).length;

        const acces =
          salaries.filter(
            accesLie
          ).length;

        return {
          total:
            salaries.length,

          actifs,

          inactifs:
            salaries.length -
            actifs,

          acces,
        };
      },
      [
        salaries,
      ]
    );

  const salariesFiltres =
    useMemo(
      () => {
        const terme =
          normaliser(
            recherche
          );

        return salaries.filter(
          (
            salarie
          ) => {
            if (
              filtre ===
                "actifs" &&
              !estActif(
                salarie
              )
            ) {
              return false;
            }

            if (
              filtre ===
                "inactifs" &&
              estActif(
                salarie
              )
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
                  salarie.prenom,
                  salarie.nom,
                  salarie.email,
                  salarie.telephone,
                  salarie.poste,
                  salarie.type_contrat,
                  salarie.statut,
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
        salaries,
        filtre,
        recherche,
      ]
    );

  function modifierChamp(
    champ:
      keyof FormulaireSalarie,
    valeur:
      string
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

  function ouvrirNouveau() {
    setErreur(
      ""
    );

    setSucces(
      ""
    );

    setFormulaire({
      ...FORMULAIRE_VIDE,
    });

    setFormulaireOuvert(
      true
    );
  }

  function ouvrirModification(
    salarie:
      Salarie
  ) {
    setErreur(
      ""
    );

    setSucces(
      ""
    );

    setFormulaire({
      id:
        salarie.id,

      prenom:
        salarie.prenom ||
        "",

      nom:
        salarie.nom ||
        "",

      telephone:
        salarie.telephone ||
        "",

      email:
        salarie.email ||
        "",

      poste:
        salarie.poste ||
        "",

      type_contrat:
        salarie.type_contrat ||
        "CDI",

      date_entree:
        salarie.date_entree
          ?.slice(
            0,
            10
          ) ||
        "",

      statut:
        salarie.statut ||
        "Actif",

      notes:
        salarie.notes ||
        "",
    });

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

    setFormulaire({
      ...FORMULAIRE_VIDE,
    });
  }

  async function enregistrerSalarie(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      enregistrement
    ) {
      return;
    }

    const nom =
      formulaire.nom.trim();

    const prenom =
      formulaire.prenom.trim();

    if (
      !nom &&
      !prenom
    ) {
      setErreur(
        "Renseignez au minimum le prénom ou le nom du salarié."
      );

      return;
    }

    const email =
      formulaire.email
        .trim()
        .toLowerCase();

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

      const payload = {
        entreprise_id:
          entrepriseId,

        nom:
          valeurNullable(
            formulaire.nom
          ),

        prenom:
          valeurNullable(
            formulaire.prenom
          ),

        telephone:
          valeurNullable(
            formulaire.telephone
          ),

        email:
          email ||
          "",

        poste:
          valeurNullable(
            formulaire.poste
          ),

        type_contrat:
          valeurNullable(
            formulaire.type_contrat
          ) ||
          "CDI",

        date_entree:
          formulaire.date_entree ||
          null,

        statut:
          formulaire.statut ||
          "Actif",

        notes:
          valeurNullable(
            formulaire.notes
          ),

        updated_at:
          new Date()
            .toISOString(),
      };

      if (
        formulaire.id
      ) {
        const {
          error,
        } =
          await supabase
            .from(
              "salaries"
            )
            .update(
              payload
            )
            .eq(
              "id",
              formulaire.id
            )
            .eq(
              "entreprise_id",
              entrepriseId
            );

        if (
          error
        ) {
          throw error;
        }

        setSucces(
          "Fiche salarié mise à jour."
        );
      } else {
        const {
          error,
        } =
          await supabase
            .from(
              "salaries"
            )
            .insert({
              ...payload,

              created_at:
                new Date()
                  .toISOString(),
            });

        if (
          error
        ) {
          throw error;
        }

        setSucces(
          "Salarié ajouté à l’équipe."
        );
      }

      setFormulaireOuvert(
        false
      );

      setFormulaire({
        ...FORMULAIRE_VIDE,
      });

      await chargerSalaries();

      onModification?.();
    } catch (
      error
    ) {
      console.error(
        "Enregistrement salarié mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible d’enregistrer le salarié."
        )
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  async function changerStatut(
    salarie:
      Salarie
  ) {
    if (
      actionId ||
      invitationId
    ) {
      return;
    }

    const actif =
      estActif(
        salarie
      );

    const nouveauStatut =
      actif
        ? "Inactif"
        : "Actif";

    const confirmation =
      window.confirm(
        actif
          ? `Désactiver ${nomComplet(
              salarie
            )} ?`
          : `Réactiver ${nomComplet(
              salarie
            )} ?`
      );

    if (
      !confirmation
    ) {
      return;
    }

    try {
      setActionId(
        salarie.id
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const {
        error,
      } =
        await supabase
          .from(
            "salaries"
          )
          .update({
            statut:
              nouveauStatut,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            salarie.id
          )
          .eq(
            "entreprise_id",
            entrepriseId
          );

      if (
        error
      ) {
        throw error;
      }

      setSucces(
        nouveauStatut ===
          "Actif"
          ? "Salarié réactivé."
          : "Salarié désactivé."
      );

      await chargerSalaries();

      onModification?.();
    } catch (
      error
    ) {
      console.error(
        "Modification statut salarié :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de modifier le statut du salarié."
        )
      );
    } finally {
      setActionId(
        null
      );
    }
  }

  async function creerAccesSalarie(
    salarie:
      Salarie
  ) {
    if (
      invitationId ||
      actionId
    ) {
      return;
    }

    if (
      accesLie(
        salarie
      )
    ) {
      setErreur(
        ""
      );

      setSucces(
        "Ce salarié possède déjà un accès Arboboard."
      );

      return;
    }

    const email =
      String(
        salarie.email ||
          ""
      )
        .trim()
        .toLowerCase();

    if (
      !email
    ) {
      setErreur(
        "Ajoutez d’abord une adresse e-mail à la fiche salarié."
      );

      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      setErreur(
        "L’adresse e-mail du salarié n’est pas valide."
      );

      return;
    }

    const confirmation =
      window.confirm(
        `Créer l’accès Arboboard de ${nomComplet(
          salarie
        )} et envoyer l’invitation à ${email} ?`
      );

    if (
      !confirmation
    ) {
      return;
    }

    try {
      setInvitationId(
        salarie.id
      );

      setErreur(
        ""
      );

      setSucces(
        ""
      );

      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError
      ) {
        throw sessionError;
      }

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Votre session Arboboard a expiré. Reconnectez-vous."
        );
      }

      const response =
        await fetch(
          `${API_ARBOBOARD}/api/creer-compte-salarie`,
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
                salarieId:
                  salarie.id,

                email,

                nom:
                  String(
                    salarie.nom ||
                      ""
                  ).trim(),

                prenom:
                  String(
                    salarie.prenom ||
                      ""
                  ).trim(),

                telephone:
                  String(
                    salarie.telephone ||
                      ""
                  ).trim(),
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
            "Impossible de créer l’accès salarié."
          )
        );
      }

      setSucces(
        typeof donnees?.message ===
          "string"
          ? donnees.message
          : `L’accès Arboboard de ${nomComplet(
              salarie
            )} a été créé.`
      );

      await chargerSalaries();

      onModification?.();
    } catch (
      error
    ) {
      console.error(
        "Création accès salarié mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de créer l’accès Arboboard du salarié."
        )
      );
    } finally {
      setInvitationId(
        null
      );
    }
  }

  return (
    <main className="salaries-mobile">
      <header className="salaries-mobile-header">
        <button
          type="button"
          className="salaries-mobile-back"
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
            Salariés
          </h1>
        </div>

        <button
          type="button"
          className="salaries-mobile-refresh"
          onClick={() =>
            void chargerSalaries()
          }
          disabled={
            chargement
          }
          aria-label="Actualiser"
        >
          ↻
        </button>
      </header>

      <section className="salaries-mobile-content">
        <section className="salaries-mobile-intro">
          <div>
            <small>
              VOTRE ÉQUIPE
            </small>

            <h2>
              Salariés
            </h2>

            <p>
              Gérez les fiches et les accès Arboboard de votre équipe.
            </p>
          </div>

          <button
            type="button"
            className="salaries-mobile-new"
            onClick={
              ouvrirNouveau
            }
          >
            ＋ Ajouter
          </button>
        </section>

        {erreur ? (
          <div
            className="salaries-mobile-error"
            role="alert"
          >
            {erreur}
          </div>
        ) : null}

        {succes ? (
          <div
            className="salaries-mobile-success"
            role="status"
          >
            {succes}
          </div>
        ) : null}

        <section className="salaries-mobile-stats">
          <article>
            <small>
              ÉQUIPE
            </small>

            <strong>
              {statistiques.total}
            </strong>
          </article>

          <article>
            <small>
              ACTIFS
            </small>

            <strong>
              {statistiques.actifs}
            </strong>
          </article>

          <article>
            <small>
              ACCÈS LIÉS
            </small>

            <strong>
              {statistiques.acces}
            </strong>
          </article>
        </section>

        <label className="salaries-mobile-search">
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
            placeholder="Nom, poste, email..."
          />
        </label>

        <div className="salaries-mobile-filters">
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
              {statistiques.total}
            </span>
          </button>

          <button
            type="button"
            className={
              filtre ===
              "actifs"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "actifs"
              )
            }
          >
            Actifs

            <span>
              {statistiques.actifs}
            </span>
          </button>

          <button
            type="button"
            className={
              filtre ===
              "inactifs"
                ? "active"
                : ""
            }
            onClick={() =>
              setFiltre(
                "inactifs"
              )
            }
          >
            Inactifs

            <span>
              {statistiques.inactifs}
            </span>
          </button>
        </div>

        {chargement ? (
          <section className="salaries-mobile-loading">
            <div className="salaries-mobile-spinner" />

            <strong>
              Chargement de l’équipe…
            </strong>
          </section>
        ) : salariesFiltres.length ===
          0 ? (
          <section className="salaries-mobile-empty">
            <span>
              🦺
            </span>

            <h3>
              Aucun salarié
            </h3>

            <p>
              Aucun salarié ne correspond à votre recherche.
            </p>

            <button
              type="button"
              onClick={
                ouvrirNouveau
              }
            >
              Ajouter un salarié
            </button>
          </section>
        ) : (
          <div className="salaries-mobile-list">
            {salariesFiltres.map(
              (
                salarie
              ) => {
                const actif =
                  estActif(
                    salarie
                  );

                const acces =
                  accesLie(
                    salarie
                  );

                const invitationEnCours =
                  invitationId ===
                  salarie.id;

                return (
                  <article
                    key={
                      salarie.id
                    }
                    className="salaries-mobile-card"
                  >
                    <div className="salaries-mobile-card-head">
                      <div className="salaries-mobile-avatar">
                        {initiales(
                          salarie
                        )}
                      </div>

                      <div className="salaries-mobile-card-name">
                        <h3>
                          {nomComplet(
                            salarie
                          )}
                        </h3>

                        <p>
                          {salarie.poste ||
                            "Poste non renseigné"}
                        </p>
                      </div>

                      <span
                        className={`salaries-mobile-status ${
                          actif
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {actif
                          ? "Actif"
                          : "Inactif"}
                      </span>
                    </div>

                    <div className="salaries-mobile-details">
                      <div>
                        <small>
                          CONTRAT
                        </small>

                        <strong>
                          {salarie.type_contrat ||
                            "—"}
                        </strong>
                      </div>

                      <div>
                        <small>
                          ENTRÉE
                        </small>

                        <strong>
                          {formatDate(
                            salarie.date_entree
                          )}
                        </strong>
                      </div>
                    </div>

                    {salarie.telephone ||
                    salarie.email ? (
                      <div className="salaries-mobile-contact">
                        {salarie.telephone ? (
                          <a
                            href={`tel:${salarie.telephone}`}
                          >
                            <span>
                              ☎
                            </span>

                            {salarie.telephone}
                          </a>
                        ) : null}

                        {salarie.email ? (
                          <a
                            href={`mailto:${salarie.email}`}
                          >
                            <span>
                              ✉
                            </span>

                            {salarie.email}
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    <div
                      className={`salaries-mobile-access ${
                        acces
                          ? "linked"
                          : ""
                      }`}
                    >
                      <span>
                        {acces
                          ? "✓"
                          : "○"}
                      </span>

                      <div>
                        <small>
                          ACCÈS ARBOBOARD
                        </small>

                        <strong>
                          {acces
                            ? "Compte salarié lié"
                            : "Aucun compte lié"}
                        </strong>
                      </div>
                    </div>

                    {!acces ? (
                      <button
                        type="button"
                        className="salaries-mobile-create-access"
                        onClick={() =>
                          void creerAccesSalarie(
                            salarie
                          )
                        }
                        disabled={
                          invitationId !==
                            null ||
                          actionId !==
                            null
                        }
                      >
                        <span>
                          🔐
                        </span>

                        <div>
                          <strong>
                            {invitationEnCours
                              ? "Création de l’accès…"
                              : "Créer l’accès Arboboard"}
                          </strong>

                          <small>
                            {salarie.email
                              ? "Envoyer l’invitation au salarié"
                              : "Ajoutez d’abord son adresse e-mail"}
                          </small>
                        </div>

                        <b>
                          →
                        </b>
                      </button>
                    ) : (
                      <div className="salaries-mobile-access-ok">
                        <span>
                          ✓
                        </span>

                        <div>
                          <strong>
                            Accès Arboboard actif
                          </strong>

                          <small>
                            Le salarié peut utiliser son compte web et mobile.
                          </small>
                        </div>
                      </div>
                    )}

                    {salarie.notes ? (
                      <p className="salaries-mobile-notes">
                        {salarie.notes}
                      </p>
                    ) : null}

                    <div className="salaries-mobile-actions">
                      <button
                        type="button"
                        onClick={() =>
                          ouvrirModification(
                            salarie
                          )
                        }
                        disabled={
                          actionId !==
                            null ||
                          invitationId !==
                            null
                        }
                      >
                        Modifier
                      </button>

                      <button
                        type="button"
                        className={
                          actif
                            ? "disable"
                            : "enable"
                        }
                        onClick={() =>
                          void changerStatut(
                            salarie
                          )
                        }
                        disabled={
                          actionId !==
                            null ||
                          invitationId !==
                            null
                        }
                      >
                        {actionId ===
                        salarie.id
                          ? "Traitement…"
                          : actif
                            ? "Désactiver"
                            : "Réactiver"}
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {formulaireOuvert ? (
        <div className="salaries-mobile-modal">
          <button
            type="button"
            className="salaries-mobile-modal-backdrop"
            onClick={
              fermerFormulaire
            }
            aria-label="Fermer"
          />

          <section className="salaries-mobile-sheet">
            <header>
              <div>
                <small>
                  {formulaire.id
                    ? "MODIFICATION"
                    : "NOUVEAU SALARIÉ"}
                </small>

                <h2>
                  {formulaire.id
                    ? "Modifier la fiche"
                    : "Ajouter un salarié"}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  fermerFormulaire
                }
                disabled={
                  enregistrement
                }
              >
                ×
              </button>
            </header>

            <form
              onSubmit={
                enregistrerSalarie
              }
            >
              <div className="salaries-mobile-two">
                <label>
                  <span>
                    Prénom
                  </span>

                  <input
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
                    autoComplete="given-name"
                  />
                </label>

                <label>
                  <span>
                    Nom
                  </span>

                  <input
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
                    autoComplete="family-name"
                  />
                </label>
              </div>

              <label>
                <span>
                  Poste
                </span>

                <input
                  value={
                    formulaire.poste
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "poste",
                      event.target.value
                    )
                  }
                  placeholder="Ex : Paysagiste"
                />
              </label>

              <div className="salaries-mobile-two">
                <label>
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
                    autoComplete="tel"
                  />
                </label>

                <label>
                  <span>
                    Email
                  </span>

                  <input
                    type="email"
                    inputMode="email"
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
                    autoComplete="email"
                  />
                </label>
              </div>

              <div className="salaries-mobile-two">
                <label>
                  <span>
                    Contrat
                  </span>

                  <select
                    value={
                      formulaire.type_contrat
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "type_contrat",
                        event.target.value
                      )
                    }
                  >
                    <option value="CDI">
                      CDI
                    </option>

                    <option value="CDD">
                      CDD
                    </option>

                    <option value="Apprentissage">
                      Apprentissage
                    </option>

                    <option value="Alternance">
                      Alternance
                    </option>

                    <option value="Saisonnier">
                      Saisonnier
                    </option>

                    <option value="Interim">
                      Intérim
                    </option>

                    <option value="Autre">
                      Autre
                    </option>
                  </select>
                </label>

                <label>
                  <span>
                    Date d’entrée
                  </span>

                  <input
                    type="date"
                    value={
                      formulaire.date_entree
                    }
                    onChange={(
                      event
                    ) =>
                      modifierChamp(
                        "date_entree",
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <label>
                <span>
                  Statut
                </span>

                <select
                  value={
                    formulaire.statut
                  }
                  onChange={(
                    event
                  ) =>
                    modifierChamp(
                      "statut",
                      event.target.value
                    )
                  }
                >
                  <option value="Actif">
                    Actif
                  </option>

                  <option value="Inactif">
                    Inactif
                  </option>
                </select>
              </label>

              <label>
                <span>
                  Notes
                </span>

                <textarea
                  rows={4}
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
                  placeholder="Informations internes..."
                />
              </label>

              <div className="salaries-mobile-sheet-info">
                <span>
                  ℹ
                </span>

                <p>
                  Enregistrez d’abord la fiche. Ensuite, le bouton « Créer l’accès Arboboard » permettra d’envoyer l’invitation sécurisée au salarié.
                </p>
              </div>

              <div className="salaries-mobile-sheet-actions">
                <button
                  type="button"
                  className="cancel"
                  onClick={
                    fermerFormulaire
                  }
                  disabled={
                    enregistrement
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="save"
                  disabled={
                    enregistrement
                  }
                >
                  {enregistrement
                    ? "Enregistrement…"
                    : formulaire.id
                      ? "Enregistrer"
                      : "Ajouter le salarié"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}