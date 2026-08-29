import {
  useEffect,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import type {
  User,
} from "@supabase/supabase-js";

import {
  supabase,
} from "./lib/supabase";

import {
  preparerMfaApresConnexion,
  verifierCodeMfa,
} from "./lib/mfa";

import {
  enregistrerAppareilConfianceMobile,
  estApplicationNative,
  verifierAppareilConfianceMobile,
} from "./lib/appareilConfianceMobile";

import DashboardChef from "./components/DashboardChef";
import DashboardSalarie from "./components/DashboardSalarie";

import "./App.css";

type ProfilUtilisateur = {
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
};

type Espace =
  | "chef"
  | "salarie";

type EtapeConnexion =
  | "identifiants"
  | "mfa";

function normaliser(
  valeur:
    | string
    | null
    | undefined
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

function determinerEspace(
  role:
    | string
    | null
    | undefined
): Espace | null {
  const valeur =
    normaliser(
      role
    );

  if (
    [
      "chef",
      "admin",
      "administrateur",
      "gerant",
      "dirigeant",
      "patron",
    ].includes(
      valeur
    )
  ) {
    return "chef";
  }

  if (
    [
      "salarie",
      "employe",
      "employee",
      "ouvrier",
      "collaborateur",
    ].includes(
      valeur
    )
  ) {
    return "salarie";
  }

  return null;
}

function profilActif(
  statut:
    | string
    | null
    | undefined
) {
  const valeur =
    normaliser(
      statut ||
        "actif"
    );

  return ![
    "archive",
    "archivee",
    "inactif",
    "supprime",
    "supprimee",
    "desactive",
    "desactivee",
  ].includes(
    valeur
  );
}

function messageErreurConnexion(
  message?:
    string
) {
  if (
    message ===
    "Invalid login credentials"
  ) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }

  return (
    message ||
    "Connexion impossible."
  );
}

function messageErreurMfa(
  error:
    unknown
) {
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
    const message =
      (
        error as {
          message:
            string;
        }
      ).message;

    const normalisee =
      message.toLowerCase();

    if (
      normalisee.includes(
        "invalid"
      ) &&
      (
        normalisee.includes(
          "code"
        ) ||
        normalisee.includes(
          "challenge"
        ) ||
        normalisee.includes(
          "verification"
        ) ||
        normalisee.includes(
          "totp"
        )
      )
    ) {
      return "Le code est incorrect ou a expiré. Attendez le prochain code puis recommencez.";
    }

    if (
      normalisee.includes(
        "rate limit"
      )
    ) {
      return "Trop de tentatives. Patientez quelques instants avant de recommencer.";
    }

    return message;
  }

  return "Une erreur inattendue est survenue.";
}

export default function App() {
  const [
    email,
    setEmail,
  ] =
    useState(
      ""
    );

  const [
    motDePasse,
    setMotDePasse,
  ] =
    useState(
      ""
    );

  const [
    codeMfa,
    setCodeMfa,
  ] =
    useState(
      ""
    );

  const [
    faireConfianceAppareil,
    setFaireConfianceAppareil,
  ] =
    useState(
      true
    );

  const [
    chargement,
    setChargement,
  ] =
    useState(
      true
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      ""
    );

  const [
    profil,
    setProfil,
  ] =
    useState<ProfilUtilisateur | null>(
      null
    );

  const [
    espace,
    setEspace,
  ] =
    useState<Espace | null>(
      null
    );

  const [
    etape,
    setEtape,
  ] =
    useState<EtapeConnexion>(
      "identifiants"
    );

  const [
    utilisateurEnAttente,
    setUtilisateurEnAttente,
  ] =
    useState<User | null>(
      null
    );

  const [
    facteurId,
    setFacteurId,
  ] =
    useState(
      ""
    );

  const [
    challengeId,
    setChallengeId,
  ] =
    useState(
      ""
    );

  const applicationNative =
    estApplicationNative();

  useEffect(() => {
    void verifierSession();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session
        ) => {
          if (
            !session?.user
          ) {
            setProfil(
              null
            );

            setEspace(
              null
            );

            setEtape(
              "identifiants"
            );

            nettoyerEtatMfa();
          }
        }
      );

    return () =>
      subscription.unsubscribe();
  }, []);

  function nettoyerEtatMfa() {
    setUtilisateurEnAttente(
      null
    );

    setFacteurId(
      ""
    );

    setChallengeId(
      ""
    );

    setCodeMfa(
      ""
    );
  }

  async function chargerProfil(
    user:
      User
  ) {
    const {
      data,
      error,
    } =
      await supabase
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
            entreprise_id
          `
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (
      error ||
      !data
    ) {
      throw new Error(
        "Profil Arboboard introuvable pour ce compte."
      );
    }

    const profilCharge =
      data as ProfilUtilisateur;

    if (
      !profilActif(
        profilCharge.statut
      )
    ) {
      throw new Error(
        "Ce compte Arboboard est désactivé."
      );
    }

    const espaceTrouve =
      determinerEspace(
        profilCharge.role
      );

    if (
      !espaceTrouve
    ) {
      throw new Error(
        `Rôle Arboboard non reconnu : ${
          profilCharge.role ||
          "non renseigné"
        }.`
      );
    }

    if (
      !profilCharge.entreprise_id
    ) {
      throw new Error(
        "Aucune entreprise n’est associée à ce compte."
      );
    }

    setProfil(
      profilCharge
    );

    setEspace(
      espaceTrouve
    );

    setEtape(
      "identifiants"
    );

    nettoyerEtatMfa();
  }

  async function appareilDejaReconnu(
    accessToken:
      string | null
  ) {
    if (
      !applicationNative ||
      !accessToken
    ) {
      return false;
    }

    try {
      return await verifierAppareilConfianceMobile(
        accessToken
      );
    } catch (
      error
    ) {
      console.warn(
        "Vérification appareil de confiance :",
        error
      );

      return false;
    }
  }

  async function gererMfaApresConnexion(
    user:
      User,
    accessToken:
      string | null
  ) {
    const {
      data:
        niveau,
      error:
        niveauError,
    } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      niveauError
    ) {
      throw niveauError;
    }

    /*
     * Déjà AAL2 :
     * aucune nouvelle vérification.
     */
    if (
      niveau.currentLevel ===
      "aal2"
    ) {
      await chargerProfil(
        user
      );

      return;
    }

    /*
     * Aucune MFA requise sur ce compte.
     */
    if (
      niveau.nextLevel !==
      "aal2"
    ) {
      await chargerProfil(
        user
      );

      return;
    }

    /*
     * Le compte exige AAL2 mais la session
     * est actuellement AAL1.
     *
     * Dans l'application native seulement,
     * on demande au serveur si le téléphone
     * possède déjà un jeton de confiance valide.
     */
    const reconnu =
      await appareilDejaReconnu(
        accessToken
      );

    if (
      reconnu
    ) {
      await chargerProfil(
        user
      );

      return;
    }

    /*
     * Téléphone non reconnu :
     * création d'un challenge TOTP normal.
     */
    const preparation =
      await preparerMfaApresConnexion();

    if (
      !preparation.necessaire
    ) {
      await chargerProfil(
        user
      );

      return;
    }

    if (
      !preparation.facteurId ||
      !preparation.challengeId
    ) {
      throw new Error(
        "Impossible de préparer la double authentification."
      );
    }

    setUtilisateurEnAttente(
      user
    );

    setFacteurId(
      preparation.facteurId
    );

    setChallengeId(
      preparation.challengeId
    );

    setCodeMfa(
      ""
    );

    setEtape(
      "mfa"
    );
  }

  async function verifierSession() {
    try {
      setChargement(
        true
      );

      setMessage(
        ""
      );

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
        !session?.user
      ) {
        return;
      }

      await gererMfaApresConnexion(
        session.user,
        session.access_token ||
          null
      );
    } catch (
      error
    ) {
      console.error(
        "Restauration session mobile :",
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Impossible de restaurer la session."
      );

      await supabase.auth.signOut();

      setProfil(
        null
      );

      setEspace(
        null
      );

      nettoyerEtatMfa();

      setEtape(
        "identifiants"
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  async function connecter(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setChargement(
        true
      );

      setMessage(
        ""
      );

      setProfil(
        null
      );

      setEspace(
        null
      );

      nettoyerEtatMfa();

      const emailNettoye =
        email
          .trim()
          .toLowerCase();

      if (
        !emailNettoye ||
        !motDePasse
      ) {
        throw new Error(
          "Renseignez votre adresse e-mail et votre mot de passe."
        );
      }

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email:
            emailNettoye,

          password:
            motDePasse,
        });

      if (
        error ||
        !data.user
      ) {
        throw new Error(
          messageErreurConnexion(
            error?.message
          )
        );
      }

      await gererMfaApresConnexion(
        data.user,
        data.session?.access_token ||
          null
      );

      setMotDePasse(
        ""
      );
    } catch (
      error
    ) {
      console.error(
        "Connexion mobile :",
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Connexion impossible."
      );

      await supabase.auth.signOut();

      setProfil(
        null
      );

      setEspace(
        null
      );

      nettoyerEtatMfa();

      setEtape(
        "identifiants"
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  async function enregistrerConfianceApresMfa() {
    if (
      !applicationNative ||
      !faireConfianceAppareil
    ) {
      return;
    }

    try {
      /*
       * Après le verify MFA, on renouvelle
       * explicitement la session afin que
       * le token envoyé à l'API contienne
       * bien le niveau AAL2.
       */
      const {
        data:
          refreshData,
        error:
          refreshError,
      } =
        await supabase.auth.refreshSession();

      if (
        refreshError
      ) {
        throw refreshError;
      }

      const accessToken =
        refreshData.session
          ?.access_token ||
        null;

      if (
        !accessToken
      ) {
        throw new Error(
          "La session sécurisée AAL2 est introuvable."
        );
      }

      const {
        data:
          niveau,
        error:
          niveauError,
      } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (
        niveauError
      ) {
        throw niveauError;
      }

      if (
        niveau.currentLevel !==
        "aal2"
      ) {
        throw new Error(
          "La session n’a pas atteint le niveau de sécurité AAL2."
        );
      }

      await enregistrerAppareilConfianceMobile(
        accessToken
      );
    } catch (
      error
    ) {
      /*
       * Le TOTP est déjà valide.
       * Un problème d'enregistrement du
       * téléphone ne doit pas empêcher
       * l'utilisateur d'entrer dans Arboboard.
       *
       * Il devra simplement refaire le TOTP
       * lors d'une prochaine connexion.
       */
      console.warn(
        "Impossible d'enregistrer le téléphone de confiance :",
        error
      );
    }
  }

  async function validerMfa(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !utilisateurEnAttente ||
      !facteurId ||
      !challengeId
    ) {
      setMessage(
        "Session MFA incomplète. Reconnectez-vous."
      );

      return;
    }

    try {
      setChargement(
        true
      );

      setMessage(
        ""
      );

      /*
       * IMPORTANT :
       * src/lib/mfa.ts attend trois
       * arguments positionnels.
       */
      await verifierCodeMfa(
        facteurId,
        challengeId,
        codeMfa
      );

      await enregistrerConfianceApresMfa();

      await chargerProfil(
        utilisateurEnAttente
      );
    } catch (
      error
    ) {
      console.error(
        "Validation MFA mobile :",
        error
      );

      setMessage(
        messageErreurMfa(
          error
        )
      );
    } finally {
      setChargement(
        false
      );
    }
  }

  async function annulerMfa() {
    try {
      setChargement(
        true
      );

      await supabase.auth.signOut();
    } finally {
      setProfil(
        null
      );

      setEspace(
        null
      );

      nettoyerEtatMfa();

      setEtape(
        "identifiants"
      );

      setMessage(
        ""
      );

      setChargement(
        false
      );
    }
  }

  async function deconnecter() {
    try {
      setChargement(
        true
      );

      /*
       * On ne supprime PAS le jeton
       * d'appareil de confiance ici.
       *
       * Une déconnexion normale doit
       * conserver la confiance pendant
       * les 90 jours prévus.
       */
      await supabase.auth.signOut();
    } finally {
      setProfil(
        null
      );

      setEspace(
        null
      );

      nettoyerEtatMfa();

      setEmail(
        ""
      );

      setMotDePasse(
        ""
      );

      setMessage(
        ""
      );

      setEtape(
        "identifiants"
      );

      setChargement(
        false
      );
    }
  }

  if (
    chargement &&
    !profil &&
    etape !==
      "mfa"
  ) {
    return (
      <main className="app-shell app-shell-center">
        <div className="loader" />

        <p className="loading-text">
          Chargement d’Arboboard…
        </p>
      </main>
    );
  }

  if (
    profil &&
    espace ===
      "chef" &&
    profil.entreprise_id
  ) {
    return (
      <DashboardChef
        entrepriseId={
          profil.entreprise_id
        }
        prenom={
          profil.prenom
        }
        onDeconnexion={() =>
          void deconnecter()
        }
      />
    );
  }

  if (
    profil &&
    espace ===
      "salarie" &&
    profil.entreprise_id
  ) {
    return (
      <DashboardSalarie
        profilId={
          profil.id
        }
        entrepriseId={
          profil.entreprise_id
        }
        prenom={
          profil.prenom
        }
        email={
          profil.email
        }
        onDeconnexion={() =>
          void deconnecter()
        }
      />
    );
  }

  if (
    etape ===
    "mfa"
  ) {
    return (
      <main className="app-shell app-shell-center">
        <section className="login-card">
          <div className="brand">
            <span className="brand-mark">
              AB
            </span>

            <span>
              arboboard
            </span>
          </div>

          <p className="eyebrow">
            DOUBLE AUTHENTIFICATION
          </p>

          <h1>
            Code de sécurité
          </h1>

          <p className="login-copy">
            Ouvrez votre application d’authentification et saisissez le code à 6 chiffres.
          </p>

          <form
            onSubmit={
              validerMfa
            }
            className="login-form"
          >
            <label>
              Code de vérification

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={
                  codeMfa
                }
                onChange={(
                  event
                ) =>
                  setCodeMfa(
                    event.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(
                        0,
                        8
                      )
                  )
                }
                required
                autoFocus
              />
            </label>

            {applicationNative ? (
              <label
                style={{
                  display:
                    "flex",

                  alignItems:
                    "flex-start",

                  gap:
                    "10px",

                  padding:
                    "12px",

                  borderRadius:
                    "12px",

                  background:
                    "#f3f0e8",

                  cursor:
                    "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    faireConfianceAppareil
                  }
                  onChange={(
                    event
                  ) =>
                    setFaireConfianceAppareil(
                      event.target.checked
                    )
                  }
                  disabled={
                    chargement
                  }
                  style={{
                    width:
                      "18px",

                    height:
                      "18px",

                    margin:
                      "1px 0 0",
                  }}
                />

                <span
                  style={{
                    display:
                      "grid",

                    gap:
                      "3px",
                  }}
                >
                  <strong
                    style={{
                      color:
                        "#17372d",

                      fontSize:
                        "13px",
                    }}
                  >
                    Faire confiance à cet appareil
                  </strong>

                  <small
                    style={{
                      color:
                        "#748078",

                      lineHeight:
                        1.45,
                    }}
                  >
                    Ne plus demander le code sur ce téléphone pendant 90 jours.
                  </small>
                </span>
              </label>
            ) : (
              <p className="security-copy">
                Le mode « appareil de confiance 90 jours » sera actif dans l’application Android/iOS installée.
              </p>
            )}

            {message ? (
              <p
                className="error-message"
                role="alert"
              >
                {message}
              </p>
            ) : null}

            <button
              className="primary-button"
              type="submit"
              disabled={
                chargement
              }
            >
              {chargement
                ? "Vérification…"
                : "Valider le code"}
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                void annulerMfa()
              }
              disabled={
                chargement
              }
            >
              Annuler
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell app-shell-center">
      <section className="login-card">
        <div className="brand">
          <span className="brand-mark">
            AB
          </span>

          <span>
            arboboard
          </span>
        </div>

        <p className="eyebrow">
          APPLICATION MOBILE
        </p>

        <h1>
          Bienvenue
        </h1>

        <p className="login-copy">
          Connectez-vous avec les mêmes identifiants que sur Arboboard.
        </p>

        <form
          onSubmit={
            connecter
          }
          className="login-form"
        >
          <label>
            Adresse e-mail

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="vous@entreprise.fr"
              value={
                email
              }
              onChange={(
                event
              ) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Mot de passe

            <input
              type="password"
              autoComplete="current-password"
              placeholder="Votre mot de passe"
              value={
                motDePasse
              }
              onChange={(
                event
              ) =>
                setMotDePasse(
                  event.target.value
                )
              }
              required
            />
          </label>

          {message ? (
            <p
              className="error-message"
              role="alert"
            >
              {message}
            </p>
          ) : null}

          <button
            className="primary-button"
            type="submit"
            disabled={
              chargement
            }
          >
            {chargement
              ? "Connexion…"
              : "Se connecter"}
          </button>
        </form>

        <p className="security-copy">
          Connexion sécurisée • Même compte Arboboard web et mobile
        </p>

        {applicationNative ? (
          <p className="security-copy">
            Stockage sécurisé Android KeyStore / iOS Keychain
          </p>
        ) : null}
      </section>
    </main>
  );
}