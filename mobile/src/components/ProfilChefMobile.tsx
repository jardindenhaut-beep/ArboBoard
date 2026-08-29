import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

import "./ProfilChefMobile.css";

type Props = {
  entrepriseId: string;

  onFermer: () => void;

  onDeconnexion: () => void;

  onModification?: () => void;
};

type ProfilChef = {
  id: string;

  email:
    string | null;

  role:
    string | null;

  nom:
    string | null;

  prenom:
    string | null;

  statut:
    string | null;

  entreprise_id:
    string | null;

  telephone_mfa:
    string | null;
};

type Entreprise = {
  id: string;

  nom_entreprise:
    string | null;

  plan_abonnement:
    string | null;

  statut_abonnement:
    string | null;
};

type FormulaireProfil = {
  prenom:
    string;

  nom:
    string;

  telephone:
    string;
};

type EtatMfa = {
  aal:
    string;

  nombreFacteurs:
    number;

  actif:
    boolean;
};

const FORMULAIRE_VIDE:
  FormulaireProfil = {
  prenom:
    "",

  nom:
    "",

  telephone:
    "",
};

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

function normaliserTelephone(
  valeur:
    string
) {
  const brut =
    valeur.trim();

  if (
    !brut
  ) {
    return null;
  }

  let numero =
    brut.replace(
      /[()\s.-]/g,
      ""
    );

  if (
    numero.startsWith(
      "00"
    )
  ) {
    numero =
      `+${numero.slice(
        2
      )}`;
  }

  if (
    /^0[67]\d{8}$/.test(
      numero
    )
  ) {
    numero =
      `+33${numero.slice(
        1
      )}`;
  } else if (
    /^33[67]\d{8}$/.test(
      numero
    )
  ) {
    numero =
      `+${numero}`;
  }

  if (
    !/^\+[1-9]\d{7,14}$/.test(
      numero
    )
  ) {
    throw new Error(
      "Le numéro de téléphone n’est pas valide. Utilisez par exemple 06 12 34 56 78."
    );
  }

  return numero;
}

function afficherTelephone(
  valeur:
    string | null | undefined
) {
  if (
    !valeur
  ) {
    return "";
  }

  if (
    /^\+33[67]\d{8}$/.test(
      valeur
    )
  ) {
    const national =
      `0${valeur.slice(
        3
      )}`;

    return national.replace(
      /(\d{2})(?=\d)/g,
      "$1 "
    );
  }

  return valeur;
}

function initiales(
  profil:
    ProfilChef | null
) {
  const prenom =
    profil?.prenom
      ?.trim()
      .charAt(
        0
      )
      .toUpperCase() ||
    "";

  const nom =
    profil?.nom
      ?.trim()
      .charAt(
        0
      )
      .toUpperCase() ||
    "";

  if (
    prenom ||
    nom
  ) {
    return `${prenom}${nom}`;
  }

  return (
    profil?.email
      ?.charAt(
        0
      )
      .toUpperCase() ||
    "A"
  );
}

function nomComplet(
  profil:
    ProfilChef | null
) {
  if (
    !profil
  ) {
    return "Compte Chef";
  }

  const nom =
    `${profil.prenom || ""} ${
      profil.nom || ""
    }`.trim();

  return (
    nom ||
    profil.email ||
    "Compte Chef"
  );
}

function libelleRole(
  role:
    string | null | undefined
) {
  const valeur =
    String(
      role ||
        ""
    )
      .trim()
      .toLowerCase();

  if (
    [
      "chef",
      "gerant",
      "gérant",
      "dirigeant",
      "patron",
    ].includes(
      valeur
    )
  ) {
    return "Chef d’entreprise";
  }

  if (
    [
      "admin",
      "administrateur",
    ].includes(
      valeur
    )
  ) {
    return "Administrateur";
  }

  return role ||
    "Chef";
}

function libellePlan(
  valeur:
    string | null | undefined
) {
  const plan =
    String(
      valeur ||
        ""
    )
      .trim()
      .toLowerCase();

  switch (
    plan
  ) {
    case "essentiel":
      return "Essentiel";

    case "pro":
      return "Pro";

    case "expert":
      return "Expert";

    case "essai":
      return "Essai";

    case "dev":
      return "Développement";

    default:
      return valeur ||
        "—";
  }
}

export default function ProfilChefMobile({
  entrepriseId,
  onFermer,
  onDeconnexion,
  onModification,
}: Props) {
  const [
    profil,
    setProfil,
  ] =
    useState<
      ProfilChef | null
    >(
      null
    );

  const [
    entreprise,
    setEntreprise,
  ] =
    useState<
      Entreprise | null
    >(
      null
    );

  const [
    formulaire,
    setFormulaire,
  ] =
    useState<FormulaireProfil>(
      FORMULAIRE_VIDE
    );

  const [
    etatMfa,
    setEtatMfa,
  ] =
    useState<EtatMfa>({
      aal:
        "aal1",

      nombreFacteurs:
        0,

      actif:
        false,
    });

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
    deconnexion,
    setDeconnexion,
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

      const [
        profilResult,
        entrepriseResult,
        facteursResult,
        aalResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "profils_utilisateurs"
            )
            .select(
              `
                id,
                email,
                role,
                nom,
                prenom,
                statut,
                entreprise_id,
                telephone_mfa
              `
            )
            .eq(
              "id",
              user.id
            )
            .maybeSingle(),

          supabase
            .from(
              "entreprises_abonnees"
            )
            .select(
              `
                id,
                nom_entreprise,
                plan_abonnement,
                statut_abonnement
              `
            )
            .eq(
              "id",
              entrepriseId
            )
            .maybeSingle(),

          supabase
            .auth
            .mfa
            .listFactors(),

          supabase
            .auth
            .mfa
            .getAuthenticatorAssuranceLevel(),
        ]);

      if (
        profilResult.error ||
        !profilResult.data
      ) {
        throw (
          profilResult.error ||
          new Error(
            "Profil chef introuvable."
          )
        );
      }

      if (
        entrepriseResult.error
      ) {
        throw entrepriseResult.error;
      }

      const profilCharge =
        profilResult.data as ProfilChef;

      if (
        profilCharge.entreprise_id !==
        entrepriseId
      ) {
        throw new Error(
          "Ce profil n’est pas rattaché à cette entreprise."
        );
      }

      setProfil(
        profilCharge
      );

      setEntreprise(
        entrepriseResult.data as Entreprise | null
      );

      setFormulaire({
        prenom:
          profilCharge.prenom ||
          "",

        nom:
          profilCharge.nom ||
          "",

        telephone:
          afficherTelephone(
            profilCharge.telephone_mfa
          ),
      });

      const facteursTotp =
        facteursResult.data
          ?.totp ||
        [];

      const facteursTelephone =
        facteursResult.data
          ?.phone ||
        [];

      const nombreFacteurs =
        facteursTotp.length +
        facteursTelephone.length;

      setEtatMfa({
        aal:
          aalResult.data
            ?.currentLevel ||
          "aal1",

        nombreFacteurs,

        actif:
          nombreFacteurs >
          0,
      });
    } catch (
      error
    ) {
      console.error(
        "Chargement profil chef mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de charger votre profil."
        )
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  function modifierChamp(
    champ:
      keyof FormulaireProfil,
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

  async function enregistrerProfil(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !profil?.id ||
      enregistrement
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

      setSucces(
        ""
      );

      const telephone =
        normaliserTelephone(
          formulaire.telephone
        );

      const payload = {
        prenom:
          valeurNullable(
            formulaire.prenom
          ),

        nom:
          valeurNullable(
            formulaire.nom
          ),

        telephone_mfa:
          telephone,
      };

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "profils_utilisateurs"
          )
          .update(
            payload
          )
          .eq(
            "id",
            profil.id
          )
          .eq(
            "entreprise_id",
            entrepriseId
          )
          .select(
            `
              id,
              email,
              role,
              nom,
              prenom,
              statut,
              entreprise_id,
              telephone_mfa
            `
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
          "Le profil n’a pas pu être mis à jour."
        );
      }

      const profilMisAJour =
        data as ProfilChef;

      setProfil(
        profilMisAJour
      );

      setFormulaire({
        prenom:
          profilMisAJour.prenom ||
          "",

        nom:
          profilMisAJour.nom ||
          "",

        telephone:
          afficherTelephone(
            profilMisAJour.telephone_mfa
          ),
      });

      setSucces(
        "Votre profil a été mis à jour."
      );

      onModification?.();
    } catch (
      error
    ) {
      console.error(
        "Mise à jour profil chef mobile :",
        error
      );

      setErreur(
        messageErreur(
          error,
          "Impossible de mettre à jour votre profil."
        )
      );
    } finally {
      setEnregistrement(
        false
      );
    }
  }

  async function actualiser() {
    if (
      chargement
    ) {
      return;
    }

    await initialiser();
  }

  async function seDeconnecter() {
    if (
      deconnexion
    ) {
      return;
    }

    const confirmation =
      window.confirm(
        "Voulez-vous vous déconnecter d’Arboboard ?"
      );

    if (
      !confirmation
    ) {
      return;
    }

    try {
      setDeconnexion(
        true
      );

      /*
       * Le véritable signOut reste géré par App.tsx
       * via la callback onDeconnexion afin de remettre
       * aussi à zéro l'état React global de l'application.
       */
      onDeconnexion();
    } finally {
      setDeconnexion(
        false
      );
    }
  }

  if (
    chargement &&
    !profil
  ) {
    return (
      <main className="profil-chef-mobile">
        <header className="profil-chef-mobile-header">
          <button
            type="button"
            className="profil-chef-mobile-back"
            onClick={
              onFermer
            }
            aria-label="Retour"
          >
            ‹
          </button>

          <div>
            <small>
              COMPTE
            </small>

            <h1>
              Mon profil
            </h1>
          </div>

          <div />
        </header>

        <section className="profil-chef-mobile-loading">
          <div className="profil-chef-mobile-spinner" />

          <strong>
            Chargement du profil…
          </strong>
        </section>
      </main>
    );
  }

  return (
    <main className="profil-chef-mobile">
      <header className="profil-chef-mobile-header">
        <button
          type="button"
          className="profil-chef-mobile-back"
          onClick={
            onFermer
          }
          aria-label="Retour"
        >
          ‹
        </button>

        <div>
          <small>
            COMPTE
          </small>

          <h1>
            Mon profil
          </h1>
        </div>

        <button
          type="button"
          className="profil-chef-mobile-refresh"
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

      <section className="profil-chef-mobile-content">
        {erreur ? (
          <div
            className="profil-chef-mobile-error"
            role="alert"
          >
            {erreur}
          </div>
        ) : null}

        {succes ? (
          <div
            className="profil-chef-mobile-success"
            role="status"
          >
            {succes}
          </div>
        ) : null}

        <section className="profil-chef-mobile-identity">
          <div className="profil-chef-mobile-avatar">
            {initiales(
              profil
            )}
          </div>

          <div className="profil-chef-mobile-identity-text">
            <small>
              PROFIL ARBOBOARD
            </small>

            <h2>
              {nomComplet(
                profil
              )}
            </h2>

            <p>
              {profil?.email ||
                "Adresse e-mail non disponible"}
            </p>
          </div>

          <span className="profil-chef-mobile-role">
            {libelleRole(
              profil?.role
            )}
          </span>
        </section>

        <section className="profil-chef-mobile-company">
          <div className="profil-chef-mobile-company-icon">
            🌳
          </div>

          <div>
            <small>
              ENTREPRISE
            </small>

            <strong>
              {entreprise?.nom_entreprise ||
                "Arboboard"}
            </strong>

            <p>
              Formule{" "}
              {libellePlan(
                entreprise?.plan_abonnement
              )}
            </p>
          </div>

          <span
            className={
              String(
                entreprise?.statut_abonnement ||
                  ""
              )
                .toLowerCase()
                .includes(
                  "suspend"
                )
                ? "warning"
                : "active"
            }
          >
            {entreprise?.statut_abonnement ||
              "Actif"}
          </span>
        </section>

        <section className="profil-chef-mobile-security">
          <div className="profil-chef-mobile-security-head">
            <div>
              <small>
                SÉCURITÉ
              </small>

              <h3>
                Double authentification
              </h3>
            </div>

            <span
              className={
                etatMfa.actif
                  ? "active"
                  : "inactive"
              }
            >
              {etatMfa.actif
                ? "Activée"
                : "Non activée"}
            </span>
          </div>

          <div className="profil-chef-mobile-security-grid">
            <div>
              <small>
                FACTEURS
              </small>

              <strong>
                {etatMfa.nombreFacteurs}
              </strong>
            </div>

            <div>
              <small>
                SESSION
              </small>

              <strong>
                {etatMfa.aal ===
                "aal2"
                  ? "Vérifiée"
                  : "Standard"}
              </strong>
            </div>
          </div>

          <p>
            La gestion complète de la double authentification reste protégée par les mécanismes de sécurité Arboboard.
          </p>
        </section>

        <form
          className="profil-chef-mobile-form"
          onSubmit={
            enregistrerProfil
          }
        >
          <div className="profil-chef-mobile-section-title">
            <small>
              INFORMATIONS PERSONNELLES
            </small>

            <h3>
              Vos coordonnées
            </h3>
          </div>

          <div className="profil-chef-mobile-two">
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
                disabled={
                  enregistrement
                }
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
                disabled={
                  enregistrement
                }
              />
            </label>
          </div>

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
              placeholder="06 12 34 56 78"
              autoComplete="tel"
              disabled={
                enregistrement
              }
            />
          </label>

          <label>
            <span>
              Adresse e-mail
            </span>

            <input
              type="email"
              value={
                profil?.email ||
                ""
              }
              readOnly
              disabled
            />

            <small className="profil-chef-mobile-field-info">
              L’adresse utilisée pour vous connecter ne se modifie pas depuis l’application mobile.
            </small>
          </label>

          <button
            type="submit"
            className="profil-chef-mobile-save"
            disabled={
              enregistrement
            }
          >
            {enregistrement
              ? "Enregistrement…"
              : "Enregistrer mes informations"}
          </button>
        </form>

        <section className="profil-chef-mobile-account">
          <div>
            <small>
              COMPTE
            </small>

            <h3>
              Session Arboboard
            </h3>

            <p>
              La déconnexion ferme votre session sur cet appareil.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void seDeconnecter()
            }
            disabled={
              deconnexion
            }
          >
            {deconnexion
              ? "Déconnexion…"
              : "Se déconnecter"}
          </button>
        </section>
      </section>
    </main>
  );
}